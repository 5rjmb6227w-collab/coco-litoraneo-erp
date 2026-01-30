/**
 * Interface do Service de Produtores.
 * Segue o princípio SOLID de Interface Segregation.
 * 
 * Services contêm a lógica de negócio e orquestram os repositories.
 */

import type {
  Producer,
  ProducerFilters,
  CreateProducerDTO,
  UpdateProducerDTO,
  PaginationOptions,
  PaginatedResult
} from '../../repositories/interfaces';

export interface ProducerSummary {
  totalActive: number;
  totalInactive: number;
  newThisMonth: number;
  topProducers: Array<{
    producer: Producer;
    totalWeight: number;
    totalLoads: number;
  }>;
}

export interface IProducerService {
  /**
   * Lista produtores com paginação e filtros
   */
  list(filters: ProducerFilters, pagination: PaginationOptions): Promise<PaginatedResult<Producer>>;

  /**
   * Busca um produtor pelo ID
   * @throws NotFoundError se não encontrar
   */
  getById(id: number): Promise<Producer>;

  /**
   * Busca um produtor pelo CPF/CNPJ
   */
  getByCpfCnpj(cpfCnpj: string): Promise<Producer | null>;

  /**
   * Cria um novo produtor
   * @throws ValidationError se CPF/CNPJ já existir
   */
  create(data: CreateProducerDTO): Promise<Producer>;

  /**
   * Atualiza um produtor existente
   * @throws NotFoundError se não encontrar
   * @throws ValidationError se CPF/CNPJ já existir em outro produtor
   */
  update(id: number, data: UpdateProducerDTO): Promise<Producer>;

  /**
   * Desativa um produtor (soft delete)
   * @throws NotFoundError se não encontrar
   */
  deactivate(id: number): Promise<void>;

  /**
   * Reativa um produtor
   * @throws NotFoundError se não encontrar
   */
  reactivate(id: number): Promise<void>;

  /**
   * Obtém resumo dos produtores
   */
  getSummary(startDate?: Date, endDate?: Date): Promise<ProducerSummary>;

  /**
   * Obtém os top produtores por volume
   */
  getTopByVolume(limit: number, startDate?: Date, endDate?: Date): Promise<Array<{
    producer: Producer;
    totalWeight: number;
    totalLoads: number;
  }>>;

  /**
   * Valida se o CPF/CNPJ é válido
   */
  validateCpfCnpj(cpfCnpj: string): boolean;

  /**
   * Formata o CPF/CNPJ
   */
  formatCpfCnpj(cpfCnpj: string): string;
}

export default IProducerService;
