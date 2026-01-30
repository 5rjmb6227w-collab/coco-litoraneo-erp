/**
 * Interface do Repository de Lotes.
 * Segue o princípio SOLID de Dependency Inversion.
 */

import type { PaginationOptions, PaginatedResult } from './IProducerRepository';

export type BatchStatus = 'available' | 'quarantine' | 'released' | 'expired' | 'consumed';

export interface BatchFilters {
  search?: string;
  status?: BatchStatus | 'all';
  skuId?: number;
  productionOrderId?: number;
  startDate?: Date;
  endDate?: Date;
  expiringDays?: number;
}

export interface CreateBatchDTO {
  code: string;
  skuId: number;
  variationId?: number;
  quantity: number;
  unit?: string;
  productionDate: Date;
  expiryDate?: Date;
  productionOrderId?: number;
  location?: string;
  notes?: string;
  createdBy?: string;
}

export interface UpdateBatchDTO {
  quantity?: number;
  status?: BatchStatus;
  location?: string;
  quarantineReason?: string;
  quarantineAt?: Date;
  quarantineBy?: string;
  releasedAt?: Date;
  releasedBy?: string;
  notes?: string;
  updatedBy?: string;
}

export interface Batch {
  id: number;
  code: string;
  skuId: number;
  variationId: number | null;
  quantity: number;
  unit: string;
  productionDate: Date;
  expiryDate: Date | null;
  productionOrderId: number | null;
  location: string | null;
  status: BatchStatus;
  quarantineReason: string | null;
  quarantineAt: Date | null;
  quarantineBy: string | null;
  releasedAt: Date | null;
  releasedBy: string | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface BatchWithDetails extends Batch {
  sku: {
    id: number;
    name: string;
    code: string;
  };
  variation?: {
    id: number;
    name: string;
  } | null;
  productionOrder?: {
    id: number;
    opNumber: string;
  } | null;
}

// ==================== RASTREABILIDADE ====================

export interface TraceabilityNode {
  id: number;
  type: 'raw_material' | 'production' | 'batch' | 'finished_goods';
  code: string;
  name: string;
  date: Date;
  quantity: number;
  unit: string;
  status: string;
  details: Record<string, unknown>;
  children?: TraceabilityNode[];
  parents?: TraceabilityNode[];
}

export interface TraceabilityChain {
  batch: BatchWithDetails;
  forward: TraceabilityNode[];  // Para onde foi
  backward: TraceabilityNode[]; // De onde veio
}

// ==================== MÉTRICAS ====================

export interface BatchSummary {
  total: number;
  available: number;
  quarantine: number;
  expiring: number;
  expired: number;
}

export interface IBatchRepository {
  // ==================== CRUD ====================

  findAll(
    filters: BatchFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<BatchWithDetails>>;

  findById(id: number): Promise<BatchWithDetails | null>;

  findByCode(code: string): Promise<BatchWithDetails | null>;

  create(data: CreateBatchDTO): Promise<Batch>;

  update(id: number, data: UpdateBatchDTO): Promise<Batch>;

  delete(id: number): Promise<void>;

  // ==================== OPERAÇÕES DE STATUS ====================

  quarantine(id: number, reason: string, userId: string): Promise<Batch>;

  release(id: number, userId: string): Promise<Batch>;

  markAsExpired(id: number): Promise<Batch>;

  consume(id: number, quantity: number, referenceType: string, referenceId: number): Promise<Batch>;

  // ==================== RASTREABILIDADE ====================

  getTraceability(batchCode: string): Promise<TraceabilityChain | null>;

  getForwardTraceability(batchId: number): Promise<TraceabilityNode[]>;

  getBackwardTraceability(batchId: number): Promise<TraceabilityNode[]>;

  // ==================== CONSULTAS ====================

  findByProductionOrder(productionOrderId: number): Promise<Batch[]>;

  findBySku(skuId: number, pagination: PaginationOptions): Promise<PaginatedResult<BatchWithDetails>>;

  findExpiring(days: number): Promise<BatchWithDetails[]>;

  findExpired(): Promise<BatchWithDetails[]>;

  findInQuarantine(): Promise<BatchWithDetails[]>;

  // ==================== MÉTRICAS ====================

  getSummary(): Promise<BatchSummary>;

  countByStatus(): Promise<Record<BatchStatus, number>>;

  getTotalQuantityBySku(skuId: number): Promise<number>;

  // ==================== GERAÇÃO DE CÓDIGO ====================

  generateBatchCode(skuCode: string, date: Date): Promise<string>;
}

export default IBatchRepository;
