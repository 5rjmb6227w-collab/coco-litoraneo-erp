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
import type { IStrategicProjectRepository } from '../repositories/interfaces';
import { NotFoundError, ValidationError, ForbiddenError } from '../errors';
import { emitEvent, EVENT_TYPES } from '../ai/eventEmitter';

export class StrategicTaskService implements IStrategicTaskService {
  private repository: IStrategicTaskRepository;
  private projectRepository: IStrategicProjectRepository;

  constructor(repository?: IStrategicTaskRepository, projectRepository?: IStrategicProjectRepository) {
    this.repository = repository || getStrategicTaskRepository();
    this.projectRepository = projectRepository || getStrategicProjectRepository();
  }

  async list(
    projectId: number,
    filters: StrategicTaskFilters,
    pagination: PaginationOptions,
    userId: number
  ): Promise<PaginatedResult<StrategicTask>> {
    // Verificar acesso ao projeto
    await this.checkProjectAccess(projectId, userId);

    // Listar tarefas com projectId no filtro
    return this.repository.findAll({ ...filters, projectId }, pagination);
  }

  async getById(id: number, userId: number): Promise<StrategicTask> {
    const task = await this.repository.findById(id);
    if (!task) {
      throw new NotFoundError('Tarefa Estratégica', id);
    }

    // Verificar acesso ao projeto
    await this.checkProjectAccess(task.projectId, userId);

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
    await this.checkProjectAccess(data.projectId, userId);

    // Criar tarefa
    const task = await this.repository.create({
      ...data,
      status: data.status || 'a_fazer',
      createdBy: userId,
    });

    // Recalcular progress do projeto
    await this.recalculateProjectProgress(data.projectId);

    // Emitir evento para Copiloto IA
    try {
      await emitEvent({
        eventType: EVENT_TYPES.STRATEGIC_TASK_CREATED,
        entityType: 'strategic_task',
        entityId: task.id,
        userId,
        payload: {
          taskCode: task.code,
          taskTitle: task.title,
          projectId: data.projectId,
          dueDate: task.dueDate,
          estimatedCost: task.estimatedCost
        }
      });
    } catch (e) { /* fire-and-forget */ }

    return task;
  }

  async update(id: number, data: UpdateStrategicTaskDTO, userId: number): Promise<StrategicTask> {
    // Verificar se existe
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Tarefa Estratégica', id);
    }

    // Verificar acesso ao projeto
    await this.checkProjectAccess(existing.projectId, userId);

    // Se status mudou para "concluida": preencher completedAt automaticamente
    if (data.status === 'concluida' && existing.status !== 'concluida') {
      data.completedAt = new Date();
    }

    // Se status mudou de "concluida" para outro: limpar completedAt
    if (data.status && data.status !== 'concluida' && existing.status === 'concluida') {
      data.completedAt = null;
    }

    // Atualizar tarefa
    const updated = await this.repository.update(id, { ...data, updatedBy: userId });

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
      try {
        await emitEvent({
          eventType: EVENT_TYPES.STRATEGIC_TASK_OVERDUE,
          entityType: 'strategic_task',
          entityId: id,
          userId,
          payload: {
            taskCode: updated.code,
            taskTitle: updated.title,
            projectId: existing.projectId,
            dueDate: updated.dueDate
          }
        });
      } catch (e) { /* fire-and-forget */ }
    }

    // Se tarefa foi concluída
    if (data.status === 'concluida') {
      try {
        await emitEvent({
          eventType: EVENT_TYPES.STRATEGIC_TASK_COMPLETED,
          entityType: 'strategic_task',
          entityId: id,
          userId,
          payload: {
            taskCode: updated.code,
            taskTitle: updated.title,
            projectId: existing.projectId,
            completedAt: data.completedAt
          }
        });
      } catch (e) { /* fire-and-forget */ }
    }

    return updated;
  }

  async delete(id: number, userId: number): Promise<void> {
    const task = await this.repository.findById(id);
    if (!task) {
      throw new NotFoundError('Tarefa Estratégica', id);
    }

    // Verificar acesso ao projeto
    await this.checkProjectAccess(task.projectId, userId);

    // Deletar tarefa
    await this.repository.delete(id);

    // Recalcular progress do projeto após exclusão
    await this.recalculateProjectProgress(task.projectId);
  }

  async reorder(projectId: number, phaseId: number, taskIds: number[], userId: number): Promise<void> {
    // Verificar acesso ao projeto
    await this.checkProjectAccess(projectId, userId);

    // Reordenar tarefas
    await this.repository.reorder(projectId, phaseId, taskIds);
  }

  async getTodayTasks(userId: number): Promise<StrategicTask[]> {
    return this.repository.findDueToday(userId);
  }

  async getOverdueTasks(userId: number): Promise<StrategicTask[]> {
    return this.repository.findOverdue(userId);
  }

  async bulkUpdateStatus(taskIds: number[], newStatus: string, userId: number): Promise<void> {
    // Validar status
    const validStatuses = ['a_fazer', 'em_andamento', 'aguardando', 'concluida', 'cancelada'];
    if (!validStatuses.includes(newStatus)) {
      throw new ValidationError(`Status inválido: ${newStatus}`);
    }

    // Atualizar status de todas as tarefas
    for (const taskId of taskIds) {
      const task = await this.repository.findById(taskId);
      if (task) {
        const updateData: UpdateStrategicTaskDTO = { 
          status: newStatus as UpdateStrategicTaskDTO['status']
        };
        
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
   * Verifica se o usuário tem acesso ao projeto
   */
  private async checkProjectAccess(projectId: number, userId: number): Promise<void> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError('Projeto Estratégico', projectId);
    }

    if (project.ownerId === userId) return;

    const isMember = await this.projectRepository.isMember(projectId, userId);
    if (!isMember) {
      throw new ForbiddenError('Você não tem acesso a este projeto');
    }
  }

  /**
   * Recalcula o progress (%) do projeto
   * progress = (tarefas_concluidas / total_tarefas) * 100
   */
  private async recalculateProjectProgress(projectId: number): Promise<void> {
    const counts = await this.repository.countByProjectAndStatus(projectId);
    
    const totalTasks = counts.a_fazer + counts.em_andamento + counts.aguardando + counts.concluida;
    // Excluímos canceladas do total
    const completedTasks = counts.concluida;

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Atualizar projeto
    await this.projectRepository.update(projectId, { progress });

    // Se projeto ficou 100% concluído
    if (progress === 100 && totalTasks > 0) {
      const project = await this.projectRepository.findById(projectId);
      if (project && project.status !== 'concluido') {
        await this.projectRepository.update(projectId, { 
          status: 'concluido',
          actualEndDate: new Date().toISOString().split('T')[0],
        });

        try {
          await emitEvent({
            eventType: EVENT_TYPES.STRATEGIC_PROJECT_COMPLETED,
            entityType: 'strategic_project',
            entityId: projectId,
            payload: {
              projectCode: project.code,
              projectTitle: project.title,
              completedAt: new Date().toISOString()
            }
          });
        } catch (e) { /* fire-and-forget */ }
      }
    }
  }

  /**
   * Recalcula o orçamento real do projeto
   * Soma actualCost de todas as tarefas
   */
  private async recalculateProjectBudget(projectId: number): Promise<void> {
    const tasks = await this.repository.findAll(
      { projectId },
      { page: 1, limit: 10000 }
    );

    // Somar actualCost (string -> number)
    const totalActualCost = tasks.data.reduce((sum: number, task) => {
      return sum + parseFloat(String(task.actualCost || '0'));
    }, 0);

    // Atualizar projeto
    await this.projectRepository.update(projectId, { budgetActual: String(totalActualCost) });

    // Verificar se orçamento foi estourado
    const project = await this.projectRepository.findById(projectId);
    if (project) {
      const budgetActual = parseFloat(String(project.budgetActual || '0'));
      const budgetPlanned = parseFloat(String(project.budgetPlanned || '0'));
      if (budgetPlanned > 0 && budgetActual > (budgetPlanned * 1.1)) {
        try {
          await emitEvent({
            eventType: EVENT_TYPES.STRATEGIC_BUDGET_EXCEEDED,
            entityType: 'strategic_project',
            entityId: projectId,
            payload: {
              projectCode: project.code,
              budgetPlanned: project.budgetPlanned,
              budgetActual: project.budgetActual,
              percentage: Math.round((budgetActual / budgetPlanned) * 100)
            }
          });
        } catch (e) { /* fire-and-forget */ }
      }
    }
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
