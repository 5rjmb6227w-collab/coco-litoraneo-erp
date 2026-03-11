/**
 * Interface do Repository de Projetos Estratégicos.
 * Segue o princípio SOLID de Dependency Inversion - Services dependem desta interface,
 * não da implementação concreta.
 */

import type { PaginationOptions, PaginatedResult } from './IProducerRepository';

// ============================================================================
// FILTROS
// ============================================================================
export interface StrategicProjectFilters {
  status?: 'planejamento' | 'em_andamento' | 'pausado' | 'concluido' | 'cancelado';
  category?: 'equipamento' | 'obra' | 'insumo' | 'processo' | 'comercial' | 'outro';
  priority?: 'critica' | 'alta' | 'media' | 'baixa';
  search?: string;
  ownerId?: number;
}

// ============================================================================
// DTOs
// ============================================================================
export interface CreateStrategicProjectDTO {
  title: string;
  description?: string;
  category: 'equipamento' | 'obra' | 'insumo' | 'processo' | 'comercial' | 'outro';
  priority: 'critica' | 'alta' | 'media' | 'baixa';
  status?: 'planejamento' | 'em_andamento' | 'pausado' | 'concluido' | 'cancelado';
  startDate?: string;
  targetEndDate?: string;
  budgetPlanned?: string;
  ownerId: number;
  photoUrl?: string;
  tags?: string[];
  createdBy?: number;
}

export interface UpdateStrategicProjectDTO {
  title?: string;
  description?: string | null;
  category?: 'equipamento' | 'obra' | 'insumo' | 'processo' | 'comercial' | 'outro';
  priority?: 'critica' | 'alta' | 'media' | 'baixa';
  status?: 'planejamento' | 'em_andamento' | 'pausado' | 'concluido' | 'cancelado';
  startDate?: string | null;
  targetEndDate?: string | null;
  actualEndDate?: string | null;
  budgetPlanned?: string | null;
  budgetActual?: string | null;
  progress?: number;
  photoUrl?: string | null;
  tags?: string[] | null;
  updatedBy?: number;
}

// ============================================================================
// ENTIDADE DE RETORNO
// ============================================================================
export interface StrategicProject {
  id: number;
  code: string;
  title: string;
  description: string | null;
  category: 'equipamento' | 'obra' | 'insumo' | 'processo' | 'comercial' | 'outro';
  priority: 'critica' | 'alta' | 'media' | 'baixa';
  status: 'planejamento' | 'em_andamento' | 'pausado' | 'concluido' | 'cancelado';
  startDate: string | null;
  targetEndDate: string | null;
  actualEndDate: string | null;
  budgetPlanned: string | null;
  budgetActual: string | null;
  progress: number;
  ownerId: number;
  photoUrl: string | null;
  tags: string[] | null;
  createdAt: Date;
  createdBy: number | null;
  updatedAt: Date | null;
  updatedBy: number | null;
}

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================
export interface StrategicPhaseDTO {
  id?: number;
  projectId: number;
  title: string;
  description?: string;
  orderIndex: number;
  status?: 'pendente' | 'em_andamento' | 'concluida';
  startDate?: string;
  endDate?: string;
}

export interface StrategicPhase {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  orderIndex: number;
  status: 'pendente' | 'em_andamento' | 'concluida';
  startDate: string | null;
  endDate: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface StrategicProjectMemberDTO {
  projectId: number;
  userId: number;
  role: 'owner' | 'editor' | 'viewer';
  addedBy?: number;
}

export interface StrategicProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: 'owner' | 'editor' | 'viewer';
  addedAt: Date;
  addedBy: number | null;
}

export interface DashboardStats {
  totalProjects: number;
  inProgress: number;
  completed: number;
  overdue: number;
  totalBudgetPlanned: number;
  totalBudgetActual: number;
}

// ============================================================================
// INTERFACE DO REPOSITORY
// ============================================================================
export interface IStrategicProjectRepository {
  /**
   * Busca todos os projetos com paginação e filtros
   */
  findAll(
    filters: StrategicProjectFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<StrategicProject>>;

  /**
   * Busca um projeto pelo ID
   */
  findById(id: number): Promise<StrategicProject | null>;

  /**
   * Busca um projeto pelo código (ex: PROJ-001)
   */
  findByCode(code: string): Promise<StrategicProject | null>;

  /**
   * Busca projetos onde o userId é membro
   */
  findByMember(
    userId: number,
    filters: StrategicProjectFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<StrategicProject>>;

  /**
   * Cria um novo projeto estratégico
   */
  create(data: CreateStrategicProjectDTO): Promise<StrategicProject>;

  /**
   * Atualiza um projeto existente
   */
  update(id: number, data: UpdateStrategicProjectDTO): Promise<StrategicProject>;

  /**
   * Remove um projeto (hard delete)
   */
  delete(id: number): Promise<void>;

  /**
   * Gera o próximo código sequencial (PROJ-001, PROJ-002, etc.)
   */
  getNextCode(): Promise<string>;

  /**
   * Retorna estatísticas do dashboard para um usuário
   */
  getDashboardStats(userId: number): Promise<DashboardStats>;

  // --- Fases ---

  /**
   * Busca todas as fases de um projeto
   */
  findPhasesByProject(projectId: number): Promise<StrategicPhase[]>;

  /**
   * Cria uma fase em um projeto
   */
  createPhase(data: StrategicPhaseDTO): Promise<StrategicPhase>;

  /**
   * Atualiza uma fase
   */
  updatePhase(id: number, data: Partial<StrategicPhaseDTO>): Promise<StrategicPhase>;

  /**
   * Remove uma fase
   */
  deletePhase(id: number): Promise<void>;

  // --- Membros ---

  /**
   * Busca todos os membros de um projeto
   */
  findMembersByProject(projectId: number): Promise<StrategicProjectMember[]>;

  /**
   * Adiciona um membro ao projeto
   */
  addMember(data: StrategicProjectMemberDTO): Promise<StrategicProjectMember>;

  /**
   * Remove um membro do projeto
   */
  removeMember(projectId: number, userId: number): Promise<void>;

  /**
   * Verifica se um usuário é membro de um projeto
   */
  isMember(projectId: number, userId: number): Promise<boolean>;

  /**
   * Retorna o papel de um membro no projeto
   */
  getMemberRole(projectId: number, userId: number): Promise<'owner' | 'editor' | 'viewer' | null>;
}

export default IStrategicProjectRepository;
