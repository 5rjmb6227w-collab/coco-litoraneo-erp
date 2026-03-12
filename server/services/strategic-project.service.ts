/**
 * Implementação do Service de Projetos Estratégicos.
 * Segue o princípio SOLID de Single Responsibility - apenas lógica de negócio.
 * 
 * Este service orquestra o StrategicProjectRepository e aplica regras de negócio.
 * 
 * CONTROLE DE ACESSO:
 * - admin / ceo → veem TODOS os projetos
 * - gerente → vê projetos onde é membro OU owner
 * - demais roles → veem APENAS projetos onde são membros
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
import { NotFoundError, ValidationError, ForbiddenError } from '../errors';
import { emitEvent, EVENT_TYPES } from '../ai/eventEmitter';

// Roles que têm visão global de todos os projetos
const GLOBAL_VIEW_ROLES = ['admin', 'ceo'];

export class StrategicProjectService implements IStrategicProjectService {
  private repository: IStrategicProjectRepository;

  constructor(repository?: IStrategicProjectRepository) {
    this.repository = repository || getStrategicProjectRepository();
  }

  /**
   * Verifica se o usuário tem visão global (admin/ceo)
   */
  private hasGlobalView(userRole: string): boolean {
    return GLOBAL_VIEW_ROLES.includes(userRole);
  }

  /**
   * Filtra projetos com base no papel do usuário.
   * admin/ceo → todos os projetos
   * demais → apenas projetos onde é owner ou membro
   */
  private async filterByAccess(
    projects: StrategicProject[],
    userId: number,
    userRole: string
  ): Promise<StrategicProject[]> {
    // admin/ceo veem tudo
    if (this.hasGlobalView(userRole)) {
      return projects;
    }

    // Demais: filtrar por membership
    const memberChecks = await Promise.all(
      projects.map(async (project) => {
        if (project.ownerId === userId) return true;
        return this.repository.isMember(project.id, userId);
      })
    );
    return projects.filter((_, i) => memberChecks[i]);
  }

  async list(
    userId: number,
    filters: StrategicProjectFilters,
    pagination: PaginationOptions,
    userRole: string = 'user'
  ): Promise<PaginatedResult<StrategicProject>> {
    const result = await this.repository.findAll(filters, pagination);
    
    const accessibleProjects = await this.filterByAccess(result.data, userId, userRole);

    return {
      ...result,
      data: accessibleProjects,
      total: accessibleProjects.length
    };
  }

  async getById(id: number, userId: number, userRole: string = 'user'): Promise<StrategicProject> {
    const project = await this.repository.findById(id);
    if (!project) {
      throw new NotFoundError('Projeto Estratégico', id);
    }

    // admin/ceo podem ver qualquer projeto
    if (!this.hasGlobalView(userRole)) {
      await this.checkAccess(id, userId, 'viewer');
    }

    return project;
  }

  async create(data: CreateStrategicProjectDTO, userId: number): Promise<StrategicProject> {
    // Validar campos obrigatórios
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Título do projeto é obrigatório');
    }

    // Criar projeto
    const project = await this.repository.create({
      ...data,
      ownerId: userId,
      status: 'planejamento',
      createdBy: userId,
    });

    // Nota: repository.create já adiciona o criador como owner nos members

    // Emitir evento para Copiloto IA
    try {
      await emitEvent({
        eventType: EVENT_TYPES.STRATEGIC_PROJECT_CREATED,
        entityType: 'strategic_project',
        entityId: project.id,
        userId,
        payload: {
          projectCode: project.code,
          projectTitle: project.title,
          budgetPlanned: project.budgetPlanned,
        }
      });
    } catch (e) {
      // fire-and-forget
    }

    return project;
  }

  async update(id: number, data: UpdateStrategicProjectDTO, userId: number, userRole: string = 'user'): Promise<StrategicProject> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Projeto Estratégico', id);
    }

    // admin/ceo podem editar qualquer projeto
    if (!this.hasGlobalView(userRole)) {
      await this.checkAccess(id, userId, 'editor');
    }

    // Atualizar projeto
    const updated = await this.repository.update(id, { ...data, updatedBy: userId });

    // Se targetEndDate mudou e passou, detectar atraso
    if (data.targetEndDate && new Date(data.targetEndDate) < new Date() && updated.status !== 'concluido' && updated.status !== 'cancelado') {
      try {
        await emitEvent({
          eventType: EVENT_TYPES.STRATEGIC_PROJECT_OVERDUE,
          entityType: 'strategic_project',
          entityId: id,
          userId,
          payload: {
            projectCode: updated.code,
            projectTitle: updated.title,
            targetEndDate: data.targetEndDate
          }
        });
      } catch (e) { /* fire-and-forget */ }
    }

    // Se orçamento estourado
    const budgetActual = parseFloat(String(updated.budgetActual || '0'));
    const budgetPlanned = parseFloat(String(updated.budgetPlanned || '0'));
    if (budgetPlanned > 0 && budgetActual > (budgetPlanned * 1.1)) {
      try {
        await emitEvent({
          eventType: EVENT_TYPES.STRATEGIC_BUDGET_EXCEEDED,
          entityType: 'strategic_project',
          entityId: id,
          userId,
          payload: {
            projectCode: updated.code,
            budgetPlanned: updated.budgetPlanned,
            budgetActual: updated.budgetActual,
            percentage: Math.round((budgetActual / budgetPlanned) * 100)
          }
        });
      } catch (e) { /* fire-and-forget */ }
    }

    return updated;
  }

  async delete(id: number, userId: number, userRole: string = 'user'): Promise<void> {
    const project = await this.repository.findById(id);
    if (!project) {
      throw new NotFoundError('Projeto Estratégico', id);
    }

    // admin/ceo podem excluir qualquer projeto; demais apenas o owner
    if (!this.hasGlobalView(userRole) && project.ownerId !== userId) {
      throw new ForbiddenError('Apenas o owner pode excluir o projeto');
    }

    // Soft delete: mudar status para cancelado
    await this.repository.update(id, { status: 'cancelado' });
  }

  async getDashboard(userId: number, userRole: string = 'user'): Promise<StrategicProjectDashboard> {
    const projects = await this.repository.findAll({}, { page: 1, limit: 1000 });
    
    const accessibleProjects = await this.filterByAccess(projects.data, userId, userRole);

    const inProgress = accessibleProjects.filter(p => p.status === 'em_andamento').length;
    const completed = accessibleProjects.filter(p => p.status === 'concluido').length;
    const overdue = accessibleProjects.filter(p => {
      if (!p.targetEndDate) return false;
      return new Date(p.targetEndDate) < new Date() && p.status !== 'concluido' && p.status !== 'cancelado';
    }).length;

    const totalBudgetPlanned = accessibleProjects.reduce((sum, p) => sum + parseFloat(String(p.budgetPlanned || '0')), 0);
    const totalBudgetActual = accessibleProjects.reduce((sum, p) => sum + parseFloat(String(p.budgetActual || '0')), 0);
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

    // Buscar role do membro
    const memberRole = await this.repository.getMemberRole(projectId, userId);
    if (!memberRole) {
      throw new ForbiddenError('Você não tem acesso a este projeto');
    }

    // Verificar hierarquia
    const roleHierarchy: Record<string, number> = { viewer: 0, editor: 1, owner: 2 };
    if ((roleHierarchy[memberRole] ?? 0) < (roleHierarchy[requiredRole] ?? 0)) {
      throw new ForbiddenError(`Você precisa ser ${requiredRole} para realizar esta ação`);
    }
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
