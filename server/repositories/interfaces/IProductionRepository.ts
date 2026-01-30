/**
 * Interface do Repository de Produção.
 * Segue o princípio SOLID de Dependency Inversion.
 */

import type { PaginationOptions, PaginatedResult } from './IProducerRepository';

export type ProductionOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type Shift = 'morning' | 'afternoon' | 'night';

// ==================== ORDENS DE PRODUÇÃO ====================

export interface ProductionOrderFilters {
  search?: string;
  status?: ProductionOrderStatus | 'all';
  skuId?: number;
  priority?: Priority;
  startDate?: Date;
  endDate?: Date;
  shift?: Shift;
}

export interface CreateProductionOrderDTO {
  opNumber: string;
  skuId: number;
  variationId?: number;
  quantity: number;
  unit?: string;
  priority?: Priority;
  plannedStart?: Date;
  plannedEnd?: Date;
  notes?: string;
  createdBy?: string;
}

export interface UpdateProductionOrderDTO {
  skuId?: number;
  variationId?: number;
  quantity?: number;
  unit?: string;
  priority?: Priority;
  status?: ProductionOrderStatus;
  plannedStart?: Date;
  plannedEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  notes?: string;
  updatedBy?: string;
}

export interface ProductionOrder {
  id: number;
  opNumber: string;
  skuId: number;
  variationId: number | null;
  quantity: number;
  unit: string;
  status: ProductionOrderStatus;
  priority: Priority;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

// ==================== APONTAMENTOS ====================

export interface ProductionLogFilters {
  productionOrderId?: number;
  skuId?: number;
  shift?: Shift;
  operatorId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateProductionLogDTO {
  productionOrderId?: number;
  skuId: number;
  variationId?: number;
  quantity: number;
  unit?: string;
  shift: Shift;
  operatorId?: string;
  operatorName?: string;
  notes?: string;
  loggedAt?: Date;
  createdBy?: string;
}

export interface ProductionLog {
  id: number;
  productionOrderId: number | null;
  skuId: number;
  variationId: number | null;
  quantity: number;
  unit: string;
  shift: Shift;
  operatorId: string | null;
  operatorName: string | null;
  notes: string | null;
  loggedAt: Date;
  createdAt: Date;
  createdBy: string | null;
}

// ==================== PROBLEMAS ====================

export interface ProductionProblemFilters {
  productionOrderId?: number;
  status?: 'open' | 'resolved' | 'all';
  problemType?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateProductionProblemDTO {
  productionOrderId?: number;
  problemType: string;
  description: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  startedAt?: Date;
  reportedBy?: string;
  createdBy?: string;
}

export interface UpdateProductionProblemDTO {
  problemType?: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  resolvedAt?: Date;
  resolution?: string;
  resolvedBy?: string;
  downtimeMinutes?: number;
  updatedBy?: string;
}

export interface ProductionProblem {
  id: number;
  productionOrderId: number | null;
  problemType: string;
  description: string;
  severity: string;
  startedAt: Date;
  resolvedAt: Date | null;
  resolution: string | null;
  resolvedBy: string | null;
  downtimeMinutes: number | null;
  reportedBy: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

// ==================== MÉTRICAS ====================

export interface ProductionByShift {
  shift: Shift;
  totalQuantity: number;
  totalLogs: number;
}

export interface ProductionBySku {
  skuId: number;
  skuName: string;
  variationId: number | null;
  variationName: string | null;
  totalQuantity: number;
}

export interface OEEMetrics {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  plannedTime: number;
  actualTime: number;
  totalProduced: number;
  totalRejected: number;
}

export interface IProductionRepository {
  // ==================== ORDENS DE PRODUÇÃO ====================
  
  findAllOrders(
    filters: ProductionOrderFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<ProductionOrder>>;

  findOrderById(id: number): Promise<ProductionOrder | null>;

  findOrderByNumber(opNumber: string): Promise<ProductionOrder | null>;

  createOrder(data: CreateProductionOrderDTO): Promise<ProductionOrder>;

  updateOrder(id: number, data: UpdateProductionOrderDTO): Promise<ProductionOrder>;

  deleteOrder(id: number): Promise<void>;

  updateOrderStatus(id: number, status: ProductionOrderStatus, userId?: string): Promise<ProductionOrder>;

  // ==================== APONTAMENTOS ====================

  findAllLogs(
    filters: ProductionLogFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<ProductionLog>>;

  findLogById(id: number): Promise<ProductionLog | null>;

  createLog(data: CreateProductionLogDTO): Promise<ProductionLog>;

  deleteLog(id: number): Promise<void>;

  // ==================== PROBLEMAS ====================

  findAllProblems(
    filters: ProductionProblemFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<ProductionProblem>>;

  findProblemById(id: number): Promise<ProductionProblem | null>;

  createProblem(data: CreateProductionProblemDTO): Promise<ProductionProblem>;

  updateProblem(id: number, data: UpdateProductionProblemDTO): Promise<ProductionProblem>;

  resolveProblem(id: number, resolution: string, resolvedBy: string, downtimeMinutes?: number): Promise<ProductionProblem>;

  // ==================== MÉTRICAS ====================

  getProductionByShift(startDate: Date, endDate: Date): Promise<ProductionByShift[]>;

  getProductionBySku(startDate: Date, endDate: Date): Promise<ProductionBySku[]>;

  getOEEMetrics(startDate: Date, endDate: Date): Promise<OEEMetrics>;

  getTotalProduction(startDate?: Date, endDate?: Date): Promise<number>;

  countOpenProblems(): Promise<number>;

  getTotalDowntimeMinutes(startDate: Date, endDate: Date): Promise<number>;

  // ==================== GERAÇÃO DE NÚMEROS ====================

  generateOpNumber(): Promise<string>;
}

export default IProductionRepository;
