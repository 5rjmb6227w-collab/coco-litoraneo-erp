/**
 * Interface do Service de Projetos Estratégicos.
 * Segue o princípio SOLID de Interface Segregation.
 * 
 * Services contêm a lógica de negócio e orquestram os repositories.
 */

import type {
  StrategicProject,
  StrategicProjectFilters,
  CreateStrategicProjectDTO,
  UpdateStrategicProjectDTO,
  PaginationOptions,
  PaginatedResult
} from '../../repositories/interfaces';

export interface StrategicProjectDashboard {
  totalProjects: number;
  inProgress: number;
  completed: number;
  overdue: number;
  totalBudgetPlanned: number;
  totalBudgetActual: number;
  averageProgress: number;
}

export interface IStrategicProjectService {
  /**
   * Lista projetos do usuário com paginação e filtros
   * Retorna apenas projetos onde o userId é owner ou membro
   */
  list(userId: number, filters: StrategicProjectFilters, pagination: PaginationOptions): Promise<PaginatedResult<StrategicProject>>;

  /**
   * Busca um projeto pelo ID
   * Verifica se userId tem acesso. Lança NotFoundError se não existir, ForbiddenError se sem acesso.
   */
  getById(id: number, userId: number): Promise<StrategicProject>;

  /**
   * Cria um novo projeto
   * Gera código automático (PROJ-XXX). Adiciona criador como owner nos members automaticamente.
   */
  create(data: CreateStrategicProjectDTO, userId: number): Promise<StrategicProject>;

  /**
   * Atualiza um projeto existente
   * Verifica se userId é owner ou editor. Lança ForbiddenError se viewer.
   */
  update(id: number, data: UpdateStrategicProjectDTO, userId: number): Promise<StrategicProject>;

  /**
   * Deleta um projeto (soft delete)
   * Apenas owner ou admin pode excluir. Lança ForbiddenError caso contrário.
   */
  delete(id: number, userId: number): Promise<void>;

  /**
   * Obtém estatísticas do dashboard
   * Retorna: total projetos, em andamento, concluídos, atrasados, orçamento total
   */
  getDashboard(userId: number): Promise<StrategicProjectDashboard>;
}

export default IStrategicProjectService;
