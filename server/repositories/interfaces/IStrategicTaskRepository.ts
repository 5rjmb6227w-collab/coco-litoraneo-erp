/**
 * Interface do Repository de Tarefas Estratégicas.
 * Segue o princípio SOLID de Dependency Inversion - Services dependem desta interface,
 * não da implementação concreta.
 */

import type { PaginationOptions, PaginatedResult } from './IProducerRepository';

// ============================================================================
// FILTROS
// ============================================================================
export interface StrategicTaskFilters {
  projectId?: number;
  phaseId?: number;
  status?: 'a_fazer' | 'em_andamento' | 'aguardando' | 'concluida' | 'cancelada';
  priority?: 'critica' | 'alta' | 'media' | 'baixa';
  assigneeId?: number;
  dueDateStart?: string;
  dueDateEnd?: string;
  search?: string;
  parentTaskId?: number | null;
}

// ============================================================================
// DTOs
// ============================================================================
export interface CreateStrategicTaskDTO {
  projectId: number;
  phaseId?: number;
  parentTaskId?: number;
  title: string;
  description?: string;
  priority: 'critica' | 'alta' | 'media' | 'baixa';
  status?: 'a_fazer' | 'em_andamento' | 'aguardando' | 'concluida' | 'cancelada';
  assigneeId?: number;
  assigneeName?: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: string;
  estimatedCost?: string;
  orderIndex?: number;
  tags?: string[];
  createdBy?: number;
}

export interface UpdateStrategicTaskDTO {
  phaseId?: number | null;
  parentTaskId?: number | null;
  title?: string;
  description?: string | null;
  priority?: 'critica' | 'alta' | 'media' | 'baixa';
  status?: 'a_fazer' | 'em_andamento' | 'aguardando' | 'concluida' | 'cancelada';
  assigneeId?: number | null;
  assigneeName?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: Date | null;
  estimatedHours?: string | null;
  actualHours?: string | null;
  estimatedCost?: string | null;
  actualCost?: string | null;
  orderIndex?: number;
  tags?: string[] | null;
  updatedBy?: number;
}

// ============================================================================
// ENTIDADE DE RETORNO
// ============================================================================
export interface StrategicTask {
  id: number;
  projectId: number;
  phaseId: number | null;
  parentTaskId: number | null;
  code: string | null;
  title: string;
  description: string | null;
  priority: 'critica' | 'alta' | 'media' | 'baixa';
  status: 'a_fazer' | 'em_andamento' | 'aguardando' | 'concluida' | 'cancelada';
  assigneeId: number | null;
  assigneeName: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: Date | null;
  estimatedHours: string | null;
  actualHours: string | null;
  estimatedCost: string | null;
  actualCost: string | null;
  orderIndex: number;
  tags: string[] | null;
  createdAt: Date;
  createdBy: number | null;
  updatedAt: Date | null;
  updatedBy: number | null;
}

// ============================================================================
// TIPOS AUXILIARES — NOTAS
// ============================================================================
export interface CreateTaskNoteDTO {
  taskId: number;
  projectId: number;
  content: string;
  noteType: 'observacao' | 'decisao' | 'problema' | 'mudanca' | 'valor';
  attachmentUrl?: string;
  createdBy?: number;
  createdByName?: string;
}

export interface TaskNote {
  id: number;
  taskId: number;
  projectId: number;
  content: string;
  noteType: 'observacao' | 'decisao' | 'problema' | 'mudanca' | 'valor';
  attachmentUrl: string | null;
  createdAt: Date;
  createdBy: number | null;
  createdByName: string | null;
}

// ============================================================================
// TIPOS AUXILIARES — DEPENDÊNCIAS
// ============================================================================
export interface CreateTaskDependencyDTO {
  taskId: number;
  dependsOnTaskId: number;
  dependencyType: 'FS' | 'SS' | 'FF' | 'SF';
}

export interface TaskDependency {
  id: number;
  taskId: number;
  dependsOnTaskId: number;
  dependencyType: 'FS' | 'SS' | 'FF' | 'SF';
}

// ============================================================================
// TIPOS AUXILIARES — LINKS COM MÓDULOS ERP
// ============================================================================
export interface CreateTaskLinkDTO {
  taskId: number;
  projectId: number;
  linkedModule: 'compras' | 'financeiro' | 'orcamento' | 'producao' | 'qualidade' | 'almoxarifado' | 'produtores' | 'cargas' | 'pagamentos' | 'rh' | 'estoque' | 'custos' | 'lotes';
  linkedEntityType: string;
  linkedEntityId: number;
  linkedEntityLabel: string;
  createdBy?: number;
}

export interface TaskLink {
  id: number;
  taskId: number;
  projectId: number;
  linkedModule: string;
  linkedEntityType: string;
  linkedEntityId: number;
  linkedEntityLabel: string;
  createdAt: Date;
  createdBy: number | null;
}

// ============================================================================
// TIPOS AUXILIARES — CONTAGENS
// ============================================================================
export interface TaskCountByStatus {
  a_fazer: number;
  em_andamento: number;
  aguardando: number;
  concluida: number;
  cancelada: number;
}

// ============================================================================
// INTERFACE DO REPOSITORY
// ============================================================================
export interface IStrategicTaskRepository {
  /**
   * Busca todas as tarefas com paginação e filtros
   */
  findAll(
    filters: StrategicTaskFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<StrategicTask>>;

  /**
   * Busca uma tarefa pelo ID
   */
  findById(id: number): Promise<StrategicTask | null>;

  /**
   * Busca todas as tarefas de um projeto (sem paginação)
   */
  findByProject(projectId: number): Promise<StrategicTask[]>;

  /**
   * Busca tarefas com vencimento hoje para um usuário
   */
  findDueToday(userId: number): Promise<StrategicTask[]>;

  /**
   * Busca tarefas atrasadas para um usuário
   */
  findOverdue(userId: number): Promise<StrategicTask[]>;

  /**
   * Cria uma nova tarefa
   */
  create(data: CreateStrategicTaskDTO): Promise<StrategicTask>;

  /**
   * Atualiza uma tarefa existente
   */
  update(id: number, data: UpdateStrategicTaskDTO): Promise<StrategicTask>;

  /**
   * Remove uma tarefa (hard delete)
   */
  delete(id: number): Promise<void>;

  /**
   * Reordena tarefas dentro de um projeto/fase
   */
  reorder(projectId: number, phaseId: number | null, taskIds: number[]): Promise<void>;

  /**
   * Conta tarefas por status para um projeto
   */
  countByProjectAndStatus(projectId: number): Promise<TaskCountByStatus>;

  /**
   * Gera o próximo código de tarefa sequencial (ex: PROJ-001-T01)
   */
  getNextCode(projectCode: string): Promise<string>;

  // --- Notas (Diário de Bordo) ---

  /**
   * Busca todas as notas de uma tarefa
   */
  findNotesByTask(taskId: number): Promise<TaskNote[]>;

  /**
   * Busca todas as notas de um projeto
   */
  findNotesByProject(projectId: number): Promise<TaskNote[]>;

  /**
   * Cria uma nota em uma tarefa
   */
  createNote(data: CreateTaskNoteDTO): Promise<TaskNote>;

  /**
   * Remove uma nota
   */
  deleteNote(id: number): Promise<void>;

  // --- Dependências ---

  /**
   * Busca dependências de uma tarefa
   */
  findDependenciesByTask(taskId: number): Promise<TaskDependency[]>;

  /**
   * Cria uma dependência entre tarefas
   */
  createDependency(data: CreateTaskDependencyDTO): Promise<TaskDependency>;

  /**
   * Remove uma dependência
   */
  deleteDependency(id: number): Promise<void>;

  // --- Links com módulos ERP ---

  /**
   * Busca links de uma tarefa
   */
  findLinksByTask(taskId: number): Promise<TaskLink[]>;

  /**
   * Busca links de um projeto
   */
  findLinksByProject(projectId: number): Promise<TaskLink[]>;

  /**
   * Cria um link com módulo ERP
   */
  createLink(data: CreateTaskLinkDTO): Promise<TaskLink>;

  /**
   * Remove um link
   */
  deleteLink(id: number): Promise<void>;
}

export default IStrategicTaskRepository;
