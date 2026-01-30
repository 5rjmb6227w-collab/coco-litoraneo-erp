/**
 * Interface do Service de Estoque.
 * Define o contrato para operações de estoque (almoxarifado e produto acabado).
 */

// ==================== TIPOS ====================

export interface StockFilters {
  warehouseType?: 'producao' | 'geral';
  category?: string;
  lowStock?: boolean;
  search?: string;
}

export interface MovementFilters {
  itemId?: number;
  movementType?: 'entrada' | 'saida' | 'ajuste' | 'transferencia';
  startDate?: Date;
  endDate?: Date;
}

export interface CreateItemDTO {
  internalCode: string;
  name: string;
  description?: string;
  unit: 'kg' | 'litro' | 'unidade' | 'metro' | 'rolo';
  warehouseType: 'producao' | 'geral';
  category: string;
  minimumStock: number;
  currentStock?: number;
  createdBy?: string;
}

export interface UpdateItemDTO {
  name?: string;
  description?: string;
  unit?: 'kg' | 'litro' | 'unidade' | 'metro' | 'rolo';
  category?: string;
  minimumStock?: number;
  updatedBy?: string;
}

export interface CreateMovementDTO {
  itemId: number;
  movementType: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  reason?: string;
  referenceType?: string;
  referenceId?: number;
  createdBy?: string;
}

export interface FinishedGoodsFilters {
  skuId?: number;
  status?: 'disponivel' | 'reservado' | 'expedido' | 'vencido';
  expiringDays?: number;
}

export interface CreateFinishedGoodsDTO {
  skuId: number;
  batchCode: string;
  quantity: number;
  productionDate: Date;
  expirationDate: Date;
  location?: string;
  createdBy?: string;
}

export interface StockAlert {
  id: number;
  itemId: number;
  itemName: string;
  itemCode: string;
  currentStock: number;
  minimumStock: number;
  deficit: number;
  warehouseType: 'producao' | 'geral';
}

export interface StockSummary {
  totalItems: number;
  lowStockItems: number;
  totalValue: number;
  movementsToday: number;
}

// ==================== INTERFACE ====================

export interface IStockService {
  // Itens de Almoxarifado
  listItems(filters: StockFilters): Promise<any[]>;
  getItemById(id: number): Promise<any>;
  getItemByCode(code: string): Promise<any | null>;
  createItem(data: CreateItemDTO): Promise<any>;
  updateItem(id: number, data: UpdateItemDTO): Promise<void>;
  deleteItem(id: number): Promise<void>;
  
  // Movimentações
  listMovements(filters: MovementFilters): Promise<any[]>;
  createMovement(data: CreateMovementDTO): Promise<any>;
  
  // Produto Acabado
  listFinishedGoods(filters: FinishedGoodsFilters): Promise<any[]>;
  getFinishedGoodsById(id: number): Promise<any>;
  createFinishedGoods(data: CreateFinishedGoodsDTO): Promise<any>;
  reserveFinishedGoods(id: number, quantity: number, reservedBy?: string): Promise<void>;
  shipFinishedGoods(id: number, quantity: number, shippedBy?: string): Promise<void>;
  
  // Alertas e Relatórios
  getLowStockAlerts(): Promise<StockAlert[]>;
  getExpiringProducts(days: number): Promise<any[]>;
  getStockSummary(): Promise<StockSummary>;
  
  // Validações
  checkStockAvailability(itemId: number, quantity: number): Promise<boolean>;
  validateMovement(itemId: number, movementType: string, quantity: number): Promise<boolean>;
}
