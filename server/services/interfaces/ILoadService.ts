/**
 * Interface do Service de Cargas.
 * Segue o princípio SOLID de Interface Segregation.
 * 
 * Services contêm a lógica de negócio e orquestram os repositories.
 */

import type {
  Load,
  LoadWithProducer,
  LoadFilters,
  CreateLoadDTO,
  UpdateLoadDTO,
  LoadStatus,
  LoadEvolution,
  PaginationOptions,
  PaginatedResult
} from '../../repositories/interfaces';

export interface LoadSummary {
  totalToday: number;
  totalWeightToday: number;
  pendingCount: number;
  byStatus: Record<LoadStatus, number>;
}

export interface ILoadService {
  /**
   * Lista cargas com paginação e filtros
   */
  list(filters: LoadFilters, pagination: PaginationOptions): Promise<PaginatedResult<LoadWithProducer>>;

  /**
   * Busca uma carga pelo ID
   * @throws NotFoundError se não encontrar
   */
  getById(id: number): Promise<LoadWithProducer>;

  /**
   * Busca uma carga pelo código externo
   */
  getByExternalCode(externalCode: string): Promise<LoadWithProducer | null>;

  /**
   * Cria uma nova carga
   * @throws ValidationError se dados inválidos
   * @throws NotFoundError se produtor não existir
   */
  create(data: CreateLoadDTO): Promise<Load>;

  /**
   * Atualiza uma carga existente
   * @throws NotFoundError se não encontrar
   * @throws BusinessError se carga já estiver fechada
   */
  update(id: number, data: UpdateLoadDTO): Promise<Load>;

  /**
   * Remove uma carga
   * @throws NotFoundError se não encontrar
   * @throws BusinessError se carga já estiver fechada
   */
  delete(id: number): Promise<void>;

  /**
   * Altera o status de uma carga
   * @throws NotFoundError se não encontrar
   * @throws BusinessError se transição de status inválida
   */
  updateStatus(id: number, status: LoadStatus, userId?: string): Promise<Load>;

  /**
   * Confere uma carga (muda status para 'conferido')
   * @throws NotFoundError se não encontrar
   * @throws BusinessError se carga não estiver com status 'recebido'
   */
  check(id: number, userId: string): Promise<Load>;

  /**
   * Fecha uma carga (muda status para 'fechado')
   * @throws NotFoundError se não encontrar
   * @throws BusinessError se carga não estiver conferida
   */
  close(id: number, userId: string): Promise<Load>;

  /**
   * Lista cargas de um produtor
   */
  listByProducer(producerId: number, pagination: PaginationOptions): Promise<PaginatedResult<Load>>;

  /**
   * Lista cargas pendentes (status = 'recebido')
   */
  listPending(): Promise<LoadWithProducer[]>;

  /**
   * Obtém resumo das cargas
   */
  getSummary(): Promise<LoadSummary>;

  /**
   * Obtém evolução das cargas por período
   */
  getEvolution(startDate: Date, endDate: Date): Promise<LoadEvolution[]>;

  /**
   * Calcula o peso total em um período
   */
  getTotalWeight(startDate?: Date, endDate?: Date): Promise<number>;

  /**
   * Verifica se uma carga pode ser editada
   */
  canEdit(id: number): Promise<boolean>;

  /**
   * Calcula o peso líquido a partir do bruto e tara
   */
  calculateNetWeight(grossWeight: number, tareWeight: number): number;
}

export default ILoadService;
