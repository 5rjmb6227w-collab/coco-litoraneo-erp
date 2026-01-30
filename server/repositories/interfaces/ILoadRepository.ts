/**
 * Interface do Repository de Cargas de Coco.
 * Segue o princípio SOLID de Dependency Inversion.
 * Adaptado para o schema real do banco de dados.
 */

import type { PaginationOptions, PaginatedResult } from './IProducerRepository';

// Status conforme o schema real: recebido, conferido, fechado
export type LoadStatus = 'recebido' | 'conferido' | 'fechado';

export interface LoadFilters {
  search?: string;
  status?: LoadStatus | 'all';
  producerId?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateLoadDTO {
  producerId: number;
  licensePlate: string;
  driverName?: string;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  observations?: string;
  photoUrl?: string;
  receivedAt?: Date;
  externalCode?: string;
  createdBy?: string;
}

export interface UpdateLoadDTO {
  licensePlate?: string;
  driverName?: string;
  grossWeight?: number;
  tareWeight?: number;
  netWeight?: number;
  observations?: string;
  photoUrl?: string;
  status?: LoadStatus;
  closedAt?: Date;
  closedBy?: string;
  updatedBy?: string;
}

export interface Load {
  id: number;
  externalCode: string | null;
  receivedAt: Date;
  producerId: number;
  licensePlate: string;
  driverName: string | null;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  observations: string | null;
  photoUrl: string | null;
  status: LoadStatus;
  closedAt: Date | null;
  closedBy: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

export interface LoadWithProducer extends Load {
  producer: {
    id: number;
    name: string;
    cpfCnpj: string;
    phone: string | null;
  };
}

export interface LoadEvolution {
  date: string;
  totalWeight: number;
  totalLoads: number;
}

export interface ILoadRepository {
  /**
   * Busca todas as cargas com paginação e filtros
   */
  findAll(
    filters: LoadFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<LoadWithProducer>>;

  /**
   * Busca uma carga pelo ID
   */
  findById(id: number): Promise<LoadWithProducer | null>;

  /**
   * Busca uma carga pelo código externo
   */
  findByExternalCode(externalCode: string): Promise<LoadWithProducer | null>;

  /**
   * Cria uma nova carga
   */
  create(data: CreateLoadDTO): Promise<Load>;

  /**
   * Atualiza uma carga existente
   */
  update(id: number, data: UpdateLoadDTO): Promise<Load>;

  /**
   * Remove uma carga
   */
  delete(id: number): Promise<void>;

  /**
   * Altera o status de uma carga
   */
  updateStatus(id: number, status: LoadStatus, userId?: string): Promise<Load>;

  /**
   * Fecha uma carga
   */
  close(id: number, closedBy: string): Promise<Load>;

  /**
   * Busca cargas por produtor
   */
  findByProducerId(producerId: number, pagination: PaginationOptions): Promise<PaginatedResult<Load>>;

  /**
   * Busca cargas pendentes (status = recebido)
   */
  findPending(): Promise<LoadWithProducer[]>;

  /**
   * Busca a evolução de cargas por período
   */
  getEvolution(startDate: Date, endDate: Date): Promise<LoadEvolution[]>;

  /**
   * Conta cargas por status
   */
  countByStatus(): Promise<Record<LoadStatus, number>>;

  /**
   * Calcula o total recebido em um período
   */
  getTotalWeight(startDate?: Date, endDate?: Date): Promise<number>;

  /**
   * Conta cargas pendentes
   */
  countPending(): Promise<number>;

  /**
   * Conta cargas de hoje
   */
  countToday(): Promise<number>;

  /**
   * Verifica se a carga pode ser editada (não está fechada)
   */
  canEdit(id: number): Promise<boolean>;
}

export default ILoadRepository;
