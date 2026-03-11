/**
 * Interface do Service de Tarefas Estratégicas.
 * Segue o princípio SOLID de Interface Segregation.
 * 
 * Services contêm a lógica de negócio e orquestram os repositories.
 */

import type {
  StrategicTask,
  StrategicTaskFilters,
  CreateStrategicTaskDTO,
  UpdateStrategicTaskDTO,
  PaginationOptions,
  PaginatedResult
} from '../../repositories/interfaces';

export interface IStrategicTaskService {
  /**
   * Lista tarefas do projeto com paginação e filtros
   * Verifica acesso ao projeto antes de listar
   */
  list(projectId: number, filters: StrategicTaskFilters, pagination: PaginationOptions, userId: number): Promise<PaginatedResult<StrategicTask>>;

  /**
   * Busca uma tarefa pelo ID com notas, vínculos e subtarefas
   */
  getById(id: number, userId: number): Promise<StrategicTask>;

  /**
   * Cria uma nova tarefa
   * Gera código automático (PROJ-XXX-T01). Recalcula progress do projeto.
   */
  create(data: CreateStrategicTaskDTO, userId: number): Promise<StrategicTask>;

  /**
   * Atualiza uma tarefa existente
   * Se status mudou para "concluida": preenche completedAt automaticamente.
   * Se estimatedCost ou actualCost mudou: recalcula budgetActual do projeto.
   * Sempre recalcula progress (%) do projeto após qualquer atualização.
   */
  update(id: number, data: UpdateStrategicTaskDTO, userId: number): Promise<StrategicTask>;

  /**
   * Deleta uma tarefa
   * Recalcula progress do projeto após exclusão.
   */
  delete(id: number, userId: number): Promise<void>;

  /**
   * Reordena tarefas dentro de uma fase
   */
  reorder(projectId: number, phaseId: number, taskIds: number[], userId: number): Promise<void>;

  /**
   * Retorna tarefas com dueDate = hoje e status != concluida/cancelada
   */
  getTodayTasks(userId: number): Promise<StrategicTask[]>;

  /**
   * Retorna tarefas com dueDate < hoje e status != concluida/cancelada
   */
  getOverdueTasks(userId: number): Promise<StrategicTask[]>;

  /**
   * Atualiza status de várias tarefas
   * Recalcula progress do projeto.
   */
  bulkUpdateStatus(taskIds: number[], newStatus: string, userId: number): Promise<void>;
}

export default IStrategicTaskService;
