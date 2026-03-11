/**
 * Implementação do Service de Tarefas Estratégicas.
 * Segue o princípio SOLID de Single Responsibility - apenas lógica de negócio.
 * 
 * Este service orquestra o StrategicTaskRepository e aplica regras de negócio.
 */

import type {
  IStrategicTaskRepository,
  StrategicTask,
  StrategicTaskFilters,
  CreateStrategicTaskDTO,
  UpdateStrategicTaskDTO,
  PaginationOptions,
  PaginatedResult
} from '../repositories/interfaces';
import type { IStrategicTaskService } from './interfaces/IStrategicTaskService';
import { getStrategicTaskRepository, getStrategicProjectRepository } from '../repositories';
import { NotFoundError, ValidationError, ForbiddenError } from '../errors';
import { emitEvent, EVENT_TYPES } from '../ai/eventEmitter';

export class StrategicTaskService implements IStrategicTaskService {
  private repository: IStrategicTaskRepository;
  private projectRepository = getStrategicProjectRepository();

  constructor(repository?: IStrategicTaskRepository) {
    // Dependency Injection - permite injetar mock para testes
    this.repository = repository || getStrategicTaskRepository();
  }

  async list(
    projectId: number,
    filters: StrategicTaskFilters,
    pagination: PaginationOptions,
    userId: number
  ): Promise<PaginatedResult<StrategicTask>> {
    // Verificar acesso ao projeto
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError('Projeto Estratégico', projectId);
    }

    const hasAccess = project.ownerId === userId || 
      (project.members && project.members.some(m => m.userId === userId));
    
    if (!hasAccess) {
      throw new ForbiddenError('Você não tem acesso a este projeto');
    }

    // Listar tarefas
    return this.repository.findAll(projectId, filters, pagination);
  }

  async getById(id: number, userId: number): Promise<StrategicTask> {
    const task = await this.repository.findById(id);
    if (!task) {
      throw new NotFoundError('Tarefa Estratégica', id);
    }

    // Verificar acesso ao projeto
    const project = await this.projectRepository.findById(task.projectId);
    if (!project) {
      throw new NotFoundError('Projeto Estratégico', task.projectId);
    }

    const hasAccess = project.ownerId === userId || 
      (project.members && project.members.some(m => m.userId === userId));
    
    if (!hasAccess) {
      throw new ForbiddenError('Você não tem acesso a esta tarefa');
    }

    return task;
  }

  async create(data: CreateStrategicTaskDTO, userId: number): Promise<StrategicTask> {
    // Validar campos obrigatórios
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Título da tarefa é obrigatório');
    }

    if (!data.projectId) {
      throw new ValidationError('ID do projeto é obrigatório');
    }

    // Verificar acesso ao projeto
    const project = await this.projectRepository.findById(data.projectId);
    if (!project) {
      throw new NotFoundError('Projeto Estratégico', data.projectId);
    }

    const hasAccess = project.ownerId === userId || 
      (project.members && project.members.some(m => m.userId === userId));
    
    if (!hasAccess) {
      throw new ForbiddenError('Você não tem acesso a este projeto');
    }

    // Gerar código automático
    const code = await this.generateTaskCode(data.projectId);

    // Criar tarefa
    const task = await this.repository.create({
      ...data,
      code,
      status: 'pendente',
      progress: 0,
      completedAt: null
    });

    // Recalcular progress do projeto
    await this.recalculateProjectProgress(data.projectId);

    // Emitir evento para Copiloto IA
    await emitEvent(EVENT_TYPES.STRATEGIC_TASK_CREATED, {
      taskId: task.id,
      taskCode: task.code,
      taskTitle: task.title,
      projectId: data.projectId,
      dueDate: task.dueDate,
      estimatedCost: task.estimatedCost
    });

    return task;
  }

  async update(id: number, data: UpdateStrategicTaskDTO, userId: number): Promise<StrategicTask> {
    // Verificar se existe
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Tarefa Estratégica', id);
    }

    // Verificar acesso ao projeto
    const project = await this.projectRepository.findById(existing.projectId);
    if (!project) {
      throw new NotFoundError('Projeto Estratégico', existing.projectId);
    }

    const hasAccess = project.ownerId === userId || 
      (project.members && project.members.some(m => m.userId === userId));
    
    if (!hasAccess) {
      throw new ForbiddenError('Você não tem acesso a esta tarefa');
    }

    // Se status mudou para "concluida": preencher completedAt automaticamente
    if (data.status === 'concluida' && existing.status !== 'concluida') {
      data.completedAt = new Date();
    }

    // Se status mudou de "concluida" para outro: limpar completedAt
    if (data.status && data.status !== 'concluida' && existing.status === 'concluida') {
      data.completedAt = null;
    }

    // Atualizar tarefa
    const updated = await this.repository.update(id, data);

    // Se estimatedCost ou actualCost mudou: recalcular budgetActual do projeto
    if ((data.estimatedCost !== undefined && data.estimatedCost !== existing.estimatedCost) ||
        (data.actualCost !== undefined && data.actualCost !== existing.actualCost)) {
      await this.recalculateProjectBudget(existing.projectId);
    }

    // Sempre recalcular progress (%) do projeto após qualquer atualização
    await this.recalculateProjectProgress(existing.projectId);

    // Se tarefa ficou atrasada
    if (updated.dueDate && new Date(updated.dueDate) < new Date() && 
        updated.status !== 'concluida' && updated.status !== 'cancelada') {
      await emitEvent(EVENT_TYPES.STRATEGIC_TASK_OVERDUE, {
        taskId: id,
        taskCode: updated.code,
        taskTitle: updated.title,
        projectId: existing.projectId,
        dueDate: updated.dueDate
      });
    }

    // Se tarefa foi concluída
    if (data.status === 'concluida') {
      await emitEvent(EVENT_TYPES.STRATEGIC_TASK_COMPLETED, {
        taskId: id,
        taskCode: updated.code,
        taskTitle: updated.title,
        projectId: existing.projectId,
        completedAt: data.completedAt
      });
    }

    return updated;
  }

  async delete(id: number, userId: number): Promise<void> {
    // Verificar se existe
    const task = await this.repository.findById(id);
    if (!task) {
      throw new NotFoundError('Tarefa Estratégica', id);
    }

    // Verificar acesso ao projeto
    const project = await this.projectRepository.findById(task.projectId);
    if (!project) {
      throw new NotFoundError('Projeto Estratégico', task.projectId);
    }

    const hasAccess = project.ownerId === userId || 
      (project.members && project.members.some(m => m.userId === userId));
    
    if (!hasAccess) {
      throw new ForbiddenError('Você não tem acesso a esta tarefa');
    }

    // Deletar tarefa
    await this.repository.delete(id);

    // Recalcular progress do projeto após exclusão
    await this.recalculateProjectProgress(task.projectId);
  }

  async reorder(projectId: number, phaseId: number, taskIds: number[], userId: number): Promise<void> {
    // Verificar acesso ao projeto
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError('Projeto Estratégico', projectId);
    }

    const hasAccess = project.ownerId === userId || 
      (project.members && project.members.some(m => m.userId === userId));
    
    if (!hasAccess) {
      throw new ForbiddenError('Você não tem acesso a este projeto');
    }

    // Reordenar tarefas
    await this.repository.reorder(phaseId, taskIds);
  }

  async getTodayTasks(userId: number): Promise<StrategicTask[]> {
    // Buscar tarefas com dueDate = hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.repository.findByDateRange(today, tomorrow, userId);
  }

  async getOverdueTasks(userId: number): Promise<StrategicTask[]> {
    // Buscar tarefas com dueDate < hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.repository.findOverdue(today, userId);
  }

  async bulkUpdateStatus(taskIds: number[], newStatus: string, userId: number): Promise<void> {
    // Validar status
    const validStatuses = ['pendente', 'em_andamento', 'concluida', 'cancelada'];
    if (!validStatuses.includes(newStatus)) {
      throw new ValidationError(`Status inválido: ${newStatus}`);
    }

    // Atualizar status de todas as tarefas
    for (const taskId of taskIds) {
      const task = await this.repository.findById(taskId);
      if (task) {
        const updateData: UpdateStrategicTaskDTO = { status: newStatus };
        
        // Se mudando para concluida, preencher completedAt
        if (newStatus === 'concluida') {
          updateData.completedAt = new Date();
        }

        await this.update(taskId, updateData, userId);
      }
    }
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Recalcula o progress (%) do projeto
   * progress = (tarefas_concluidas / total_tarefas) * 100
   */
  private async recalculateProjectProgress(projectId: number): Promise<void> {
    // Buscar todas as tarefas do projeto (excluindo canceladas)
    const tasks = await this.repository.findAll(
      projectId,
      { status: 'não_cancelada' },
      { page: 1, limit: 10000 }
    );

    const totalTasks = tasks.data.filter(t => t.status !== 'cancelada').length;
    const completedTasks = tasks.data.filter(t => t.status === 'concluida').length;

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Atualizar projeto
    await this.projectRepository.update(projectId, { progress });

    // Se projeto ficou 100% concluído
    if (progress === 100) {
      const project = await this.projectRepository.findById(projectId);
      if (project && project.status !== 'concluido') {
        await this.projectRepository.update(projectId, { 
          status: 'concluido',
          completedAt: new Date()
        });

        await emitEvent(EVENT_TYPES.STRATEGIC_PROJECT_COMPLETED, {
          projectId,
          projectCode: project.code,
          projectTitle: project.title,
          completedAt: new Date()
        });
      }
    }
  }

  /**
   * Recalcula o orçamento real do projeto
   * Soma actualCost de todas as tarefas
   */
  private async recalculateProjectBudget(projectId: number): Promise<void> {
    // Buscar todas as tarefas do projeto
    const tasks = await this.repository.findAll(
      projectId,
      {},
      { page: 1, limit: 10000 }
    );

    // Somar actualCost
    const totalActualCost = tasks.data.reduce((sum, task) => sum + (task.actualCost || 0), 0);

    // Atualizar projeto
    await this.projectRepository.update(projectId, { budgetActual: totalActualCost });

    // Verificar se orçamento foi estourado
    const project = await this.projectRepository.findById(projectId);
    if (project && project.budgetActual > (project.budgetPlanned * 1.1)) {
      await emitEvent(EVENT_TYPES.STRATEGIC_BUDGET_EXCEEDED, {
        projectId,
        projectCode: project.code,
        budgetPlanned: project.budgetPlanned,
        budgetActual: project.budgetActual,
        percentage: Math.round((project.budgetActual / project.budgetPlanned) * 100)
      });
    }
  }

  /**
   * Gera código automático da tarefa
   * Formato: PROJ-XXX-T01, PROJ-XXX-T02, etc.
   */
  private async generateTaskCode(projectId: number): Promise<string> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError('Projeto Estratégico', projectId);
    }

    const tasks = await this.repository.findAll(
      projectId,
      {},
      { page: 1, limit: 10000 }
    );

    const codes = tasks.data
      .map(t => t.code)
      .filter(code => code.includes('-T'))
      .map(code => {
        const match = code.match(/-T(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => !isNaN(num))
      .sort((a, b) => b - a);

    const nextNumber = (codes[0] || 0) + 1;
    return `${project.code}-T${String(nextNumber).padStart(2, '0')}`;
  }
}

// Factory function para obter instância singleton
let taskServiceInstance: StrategicTaskService | null = null;

export function getStrategicTaskService(): StrategicTaskService {
  if (!taskServiceInstance) {
    taskServiceInstance = new StrategicTaskService();
  }
  return taskServiceInstance;
}

export default StrategicTaskService;
