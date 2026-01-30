/**
 * Interface do Repository de Produtores.
 * Segue o princípio SOLID de Dependency Inversion - Services dependem desta interface,
 * não da implementação concreta.
 */

export interface ProducerFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  city?: string;
  state?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProducerDTO {
  name: string;
  cpfCnpj: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  pixKey?: string;
  externalCode?: string;
  notes?: string;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateProducerDTO {
  name?: string;
  cpfCnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  pixKey?: string;
  externalCode?: string;
  notes?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface Producer {
  id: number;
  name: string;
  cpfCnpj: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  bankName: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  pixKey: string | null;
  externalCode: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface IProducerRepository {
  /**
   * Busca todos os produtores com paginação e filtros
   */
  findAll(
    filters: ProducerFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Producer>>;

  /**
   * Busca um produtor pelo ID
   */
  findById(id: number): Promise<Producer | null>;

  /**
   * Busca um produtor pelo CPF/CNPJ
   */
  findByCpfCnpj(cpfCnpj: string): Promise<Producer | null>;

  /**
   * Busca um produtor pelo código externo
   */
  findByExternalCode(externalCode: string): Promise<Producer | null>;

  /**
   * Cria um novo produtor
   */
  create(data: CreateProducerDTO): Promise<Producer>;

  /**
   * Atualiza um produtor existente
   */
  update(id: number, data: UpdateProducerDTO): Promise<Producer>;

  /**
   * Remove um produtor (soft delete - marca como inativo)
   */
  delete(id: number): Promise<void>;

  /**
   * Conta o total de produtores ativos
   */
  countActive(): Promise<number>;

  /**
   * Busca os top produtores por volume de cargas
   */
  findTopByVolume(limit: number, startDate?: Date, endDate?: Date): Promise<Array<{
    producer: Producer;
    totalWeight: number;
    totalLoads: number;
  }>>;

  /**
   * Verifica se um CPF/CNPJ já existe (excluindo um ID específico)
   */
  existsByCpfCnpj(cpfCnpj: string, excludeId?: number): Promise<boolean>;
}

export default IProducerRepository;
