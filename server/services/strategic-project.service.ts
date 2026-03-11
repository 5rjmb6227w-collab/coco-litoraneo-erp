/**
 * Implementação do Service de Projetos Estratégicos.
 * Segue o princípio SOLID de Single Responsibility - apenas lógica de negócio.
 * 
 * Este service orquestra o StrategicProjectRepository e aplica regras de negócio.
 */

import type {
  IStrategicProjectRepository,
  StrategicProject,
  StrategicProjectFilters,
  CreateStrategicProjectDTO,
  UpdateStrategicProjectDTO,
  PaginationOptions,
  PaginatedResult
} from '../repositories/interfaces';
import type { IStrategicProjectService, StrategicProjectDashboard } from './interfaces/IStrategicProjectService';
import { getStrategicProjectRepository } from '../repositories';
import { NotFoundError, ValidationError, ForbiddenError, BusinessError } from '../errors';
import { emitEvent, EVENT_TYPES } from '../ai/eventEmitter';

export class StrategicProjectService implements IStrategicProjectService {
  private repository: IStrategicProjectRepository;

  constructor(repository?: IStrategicProjectRepository) {
    // Dependency Injection - permite injetar mock para testes
    this.repository = repository || getStrategicProjectRepository();
  }

  async list(
    userId: number,
    filters: StrategicProjectFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<StrategicProject>> {
    // Adicionar filtro de acesso: apenas projetos onde o usuário é owner ou membro
    const result = await this.repository.findAll(filters, pagination);
    
    // Filtrar apenas projetos acessíveis ao usuário
    const accessibleProjects = result.data.filter(project => 
      project.ownerId === userId || 
      (project.members && project.members.some(m => m.userId === userId))
    );

    return {
      ...result,
      data: accessibleProjects,
      total: accessibleProjects.length
    };
  }

  async getById(id: number, userId: number): Promise<StrategicProject> {
    const project = await this.repository.findById(id);
    if (!project) {
      throw new NotFoundError('Projeto Estratégico', id);
    }

    // Verificar acesso
    await this.checkAccess(id, userId, 'viewer');

    return project;
  }

  async create(data: CreateStrategicProjectDTO, userId: number): Promise<StrategicProject> {
    // Validar campos obrigatórios
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Título do projeto é obrigatório');
    }

    // Gerar código automático
    const code = await this.generateProjectCode();

    // Criar projeto
    const project = await this.repository.create({
      ...data,
      code,
      ownerId: userId,
      status: 'planejamento',
      progress: 0,
      budgetActual: 0
    });

    // Adicionar criador como owner nos members automaticamente
    await this.repository.addMember(project.id, userId, 'owner');

    // Emitir evento para Copiloto IA
    await emitEvent(EVENT_TYPES.STRATEGIC_PROJECT_CREATED, {
      projectId: project.id,
      projectCode: project.code,
      projectTitle: project.title,
      ownerId: userId,
      budgetPlanned: project.budgetPlanned,
      dueDate: project.dueDate
    });

    return project;
  }

  async update(id: number, data: UpdateStrategicProjectDTO, userId: number): Promise<StrategicProject> {
    // Verificar se existe
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Projeto Estratégico', id);
    }

    // Verificar acesso (apenas owner ou editor podem editar)
    await this.checkAccess(id, userId, 'editor');

    // Atualizar projeto
    const updated = await this.repository.update(id, data);

    // Se budgetPlanned mudou, recalcular budgetActual
    if (data.budgetPlanned !== undefined && data.budgetPlanned !== existing.budgetPlanned) {
      await this.recalculateBudget(id);
    }

    // Se dueDate mudou e passou, detectar atraso
    if (data.dueDate && new Date(data.dueDate) < new Date() && updated.status !== 'concluido' && updated.status !== 'cancelado') {
      await emitEvent(EVENT_TYPES.STRATEGIC_PROJECT_OVERDUE, {
        projectId: id,
        projectCode: updated.code,
        projectTitle: updated.title,
        dueDate: data.dueDate
      });
    }

    // Se orçamento estourado
    if (updated.budgetActual > (updated.budgetPlanned * 1.1)) {
      await emitEvent(EVENT_TYPES.STRATEGIC_BUDGET_EXCEEDED, {
        projectId: id,
        projectCode: updated.code,
        budgetPlanned: updated.budgetPlanned,
        budgetActual: updated.budgetActual,
        percentage: Math.round((updated.budgetActual / updated.budgetPlanned) * 100)
      });
    }

    return updated;
  }

  async delete(id: number, userId: number): Promise<void> {
    // Verificar se existe
    const project = await this.repository.findById(id);
    if (!project) {
      throw new NotFoundError('Projeto Estratégico', id);
    }

    // Apenas owner ou admin pode excluir
    if (project.ownerId !== userId) {
      throw new ForbiddenError('Apenas o owner pode excluir o projeto');
    }

    // Soft delete: mudar status para cancelado
    await this.repository.update(id, { status: 'cancelado' });
  }

  async getDashboard(userId: number): Promise<StrategicProjectDashboard> {
    const projects = await this.repository.findAll({}, { page: 1, limit: 1000 });
    
    // Filtrar apenas projetos acessíveis ao usuário
    const accessibleProjects = projects.data.filter(project => 
      project.ownerId === userId || 
      (project.members && project.members.some(m => m.userId === userId))
    );

    const inProgress = accessibleProjects.filter(p => p.status === 'andamento').length;
    const completed = accessibleProjects.filter(p => p.status === 'concluido').length;
    const overdue = accessibleProjects.filter(p => 
      new Date(p.dueDate) < new Date() && p.status !== 'concluido' && p.status !== 'cancelado'
    ).length;

    const totalBudgetPlanned = accessibleProjects.reduce((sum, p) => sum + (p.budgetPlanned || 0), 0);
    const totalBudgetActual = accessibleProjects.reduce((sum, p) => sum + (p.budgetActual || 0), 0);
    const averageProgress = accessibleProjects.length > 0 
      ? Math.round(accessibleProjects.reduce((sum, p) => sum + (p.progress || 0), 0) / accessibleProjects.length)
      : 0;

    return {
      totalProjects: accessibleProjects.length,
      inProgress,
      completed,
      overdue,
      totalBudgetPlanned,
      totalBudgetActual,
      averageProgress
    };
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Verifica se o usuário tem acesso ao projeto
   * Hierarquia: owner > editor > viewer
   */
  private async checkAccess(projectId: number, userId: number, requiredRole: 'viewer' | 'editor' | 'owner'): Promise<void> {
    const project = await this.repository.findById(projectId);
    if (!project) {
      throw new NotFoundError('Projeto Estratégico', projectId);
    }

    // Owner sempre tem acesso
    if (project.ownerId === userId) {
      return;
    }

    // Buscar membro
    const member = project.members?.find(m => m.userId === userId);
    if (!member) {
      throw new ForbiddenError('Você não tem acesso a este projeto');
    }

    // Verificar hierarquia
    const roleHierarchy = { viewer: 0, editor: 1, owner: 2 };
    if (roleHierarchy[member.role as keyof typeof roleHierarchy] < roleHierarchy[requiredRole]) {
      throw new ForbiddenError(`Você precisa ser ${requiredRole} para realizar esta ação`);
    }
  }

  /**
   * Gera código automático do projeto
   * Formato: PROJ-001, PROJ-002, etc.
   */
  private async generateProjectCode(): Promise<string> {
    const projects = await this.repository.findAll({}, { page: 1, limit: 1000 });
    const codes = projects.data
      .map(p => p.code)
      .filter(code => code.startsWith('PROJ-'))
      .map(code => parseInt(code.replace('PROJ-', ''), 10))
      .filter(num => !isNaN(num))
      .sort((a, b) => b - a);

    const nextNumber = (codes[0] || 0) + 1;
    return `PROJ-${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * Recalcula o orçamento real do projeto
   * Soma actualCost de todas as tarefas
   */
  private async recalculateBudget(projectId: number): Promise<void> {
    // Buscar todas as tarefas do projeto
    const tasks = await this.repository.getTasksByProject(projectId);
    
    // Somar actualCost
    const totalActualCost = tasks.reduce((sum, task) => sum + (task.actualCost || 0), 0);

    // Atualizar projeto
    await this.repository.update(projectId, { budgetActual: totalActualCost });
  }
}

// Factory function para obter instância singleton
let projectServiceInstance: StrategicProjectService | null = null;

export function getStrategicProjectService(): StrategicProjectService {
  if (!projectServiceInstance) {
    projectServiceInstance = new StrategicProjectService();
  }
  return projectServiceInstance;
}

export default StrategicProjectService;
