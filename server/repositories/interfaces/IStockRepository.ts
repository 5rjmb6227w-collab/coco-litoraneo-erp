/**
 * Interface do Repository de Estoque (Almoxarifado + Produto Acabado).
 * Segue o princípio SOLID de Dependency Inversion.
 */

import type { PaginationOptions, PaginatedResult } from './IProducerRepository';

export type MovementType = 'input' | 'output' | 'adjustment' | 'transfer';
export type WarehouseCategory = 'production' | 'general' | 'cleaning' | 'epi' | 'maintenance' | 'packaging';

// ==================== ITENS DE ALMOXARIFADO ====================

export interface WarehouseItemFilters {
  search?: string;
  category?: WarehouseCategory | 'all';
  belowMinimum?: boolean;
  isActive?: boolean;
}

export interface CreateWarehouseItemDTO {
  name: string;
  code?: string;
  category: WarehouseCategory;
  unit: string;
  currentStock?: number;
  minimumStock?: number;
  maximumStock?: number;
  location?: string;
  supplier?: string;
  notes?: string;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateWarehouseItemDTO {
  name?: string;
  code?: string;
  category?: WarehouseCategory;
  unit?: string;
  currentStock?: number;
  minimumStock?: number;
  maximumStock?: number;
  location?: string;
  supplier?: string;
  notes?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface WarehouseItem {
  id: number;
  name: string;
  code: string | null;
  category: WarehouseCategory;
  unit: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number | null;
  location: string | null;
  supplier: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

// ==================== MOVIMENTAÇÕES ====================

export interface MovementFilters {
  itemId?: number;
  type?: MovementType | 'all';
  startDate?: Date;
  endDate?: Date;
  userId?: string;
}

export interface CreateMovementDTO {
  itemId: number;
  type: MovementType;
  quantity: number;
  unitPrice?: number;
  totalValue?: number;
  referenceType?: string;
  referenceId?: number;
  notes?: string;
  performedBy?: string;
  createdBy?: string;
}

export interface Movement {
  id: number;
  itemId: number;
  type: MovementType;
  quantity: number;
  unitPrice: number | null;
  totalValue: number | null;
  referenceType: string | null;
  referenceId: number | null;
  notes: string | null;
  performedBy: string | null;
  createdAt: Date;
  createdBy: string | null;
}

export interface MovementWithItem extends Movement {
  item: {
    id: number;
    name: string;
    code: string | null;
    unit: string;
  };
}

// ==================== PRODUTO ACABADO ====================

export interface FinishedGoodsFilters {
  search?: string;
  skuId?: number;
  variationId?: number;
  belowMinimum?: boolean;
  expiringDays?: number;
}

export interface CreateFinishedGoodsDTO {
  skuId: number;
  variationId?: number;
  batchNumber: string;
  quantity: number;
  unit?: string;
  productionDate: Date;
  expiryDate?: Date;
  location?: string;
  notes?: string;
  createdBy?: string;
}

export interface UpdateFinishedGoodsDTO {
  quantity?: number;
  location?: string;
  notes?: string;
  status?: 'available' | 'reserved' | 'shipped' | 'expired';
  updatedBy?: string;
}

export interface FinishedGoods {
  id: number;
  skuId: number;
  variationId: number | null;
  batchNumber: string;
  quantity: number;
  unit: string;
  productionDate: Date;
  expiryDate: Date | null;
  location: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface FinishedGoodsWithSku extends FinishedGoods {
  sku: {
    id: number;
    name: string;
    code: string;
  };
  variation?: {
    id: number;
    name: string;
  } | null;
}

// ==================== ALERTAS ====================

export interface StockAlert {
  itemId: number;
  itemName: string;
  itemType: 'warehouse' | 'finished_goods';
  alertType: 'below_minimum' | 'expiring' | 'expired';
  currentValue: number;
  thresholdValue: number;
  unit: string;
  expiryDate?: Date;
}

export interface IStockRepository {
  // ==================== ITENS DE ALMOXARIFADO ====================

  findAllWarehouseItems(
    filters: WarehouseItemFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<WarehouseItem>>;

  findWarehouseItemById(id: number): Promise<WarehouseItem | null>;

  findWarehouseItemByCode(code: string): Promise<WarehouseItem | null>;

  createWarehouseItem(data: CreateWarehouseItemDTO): Promise<WarehouseItem>;

  updateWarehouseItem(id: number, data: UpdateWarehouseItemDTO): Promise<WarehouseItem>;

  deleteWarehouseItem(id: number): Promise<void>;

  updateWarehouseStock(id: number, quantity: number, operation: 'add' | 'subtract' | 'set'): Promise<WarehouseItem>;

  // ==================== MOVIMENTAÇÕES ====================

  findAllMovements(
    filters: MovementFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<MovementWithItem>>;

  findMovementById(id: number): Promise<MovementWithItem | null>;

  createMovement(data: CreateMovementDTO): Promise<Movement>;

  getMovementsByItem(itemId: number, pagination: PaginationOptions): Promise<PaginatedResult<Movement>>;

  // ==================== PRODUTO ACABADO ====================

  findAllFinishedGoods(
    filters: FinishedGoodsFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<FinishedGoodsWithSku>>;

  findFinishedGoodsById(id: number): Promise<FinishedGoodsWithSku | null>;

  findFinishedGoodsByBatch(batchNumber: string): Promise<FinishedGoodsWithSku | null>;

  createFinishedGoods(data: CreateFinishedGoodsDTO): Promise<FinishedGoods>;

  updateFinishedGoods(id: number, data: UpdateFinishedGoodsDTO): Promise<FinishedGoods>;

  deleteFinishedGoods(id: number): Promise<void>;

  // ==================== ALERTAS E MÉTRICAS ====================

  getStockAlerts(): Promise<StockAlert[]>;

  getItemsBelowMinimum(): Promise<WarehouseItem[]>;

  getExpiringProducts(days: number): Promise<FinishedGoodsWithSku[]>;

  getExpiredProducts(): Promise<FinishedGoodsWithSku[]>;

  getTotalStockValue(): Promise<number>;

  countItemsBelowMinimum(): Promise<number>;

  countExpiringProducts(days: number): Promise<number>;
}

export default IStockRepository;
