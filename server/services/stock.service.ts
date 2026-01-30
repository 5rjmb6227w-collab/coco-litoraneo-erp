/**
 * Implementação do Service de Estoque.
 * Segue o princípio SOLID de Single Responsibility - apenas lógica de negócio de estoque.
 */

import type {
  IStockService,
  StockFilters,
  MovementFilters,
  CreateItemDTO,
  UpdateItemDTO,
  CreateMovementDTO,
  FinishedGoodsFilters,
  CreateFinishedGoodsDTO,
  StockAlert,
  StockSummary
} from './interfaces/IStockService';
import { NotFoundError, ValidationError, BusinessError } from '../errors';
import * as db from '../db';

export class StockService implements IStockService {
  
  // ==================== ITENS DE ALMOXARIFADO ====================
  
  async listItems(filters: StockFilters): Promise<any[]> {
    return db.getWarehouseItems({
      warehouseType: filters.warehouseType,
      category: filters.category,
      search: filters.search
    });
  }
  
  async getItemById(id: number): Promise<any> {
    const item = await db.getWarehouseItemById(id);
    if (!item) {
      throw new NotFoundError('Item de Almoxarifado', id);
    }
    return item;
  }
  
  async getItemByCode(code: string): Promise<any | null> {
    const items = await db.getWarehouseItems({ search: code });
    return items.find((item: any) => item.internalCode === code) || null;
  }
  
  async createItem(data: CreateItemDTO): Promise<any> {
    // Validar código único
    const existing = await this.getItemByCode(data.internalCode);
    if (existing) {
      throw new ValidationError(`Código interno '${data.internalCode}' já existe`);
    }
    
    // Validar estoque mínimo
    if (data.minimumStock < 0) {
      throw new ValidationError('Estoque mínimo não pode ser negativo');
    }
    
    const id = await db.createWarehouseItem({
      internalCode: data.internalCode,
      name: data.name,
      description: data.description,
      unit: data.unit,
      warehouseType: data.warehouseType,
      category: data.category,
      minimumStock: data.minimumStock.toString(),
      currentStock: (data.currentStock || 0).toString(),
      createdBy: data.createdBy ? Number(data.createdBy) : undefined,
    });
    
    return { id };
  }
  
  async updateItem(id: number, data: UpdateItemDTO): Promise<void> {
    await this.getItemById(id); // Valida existência
    
    if (data.minimumStock !== undefined && data.minimumStock < 0) {
      throw new ValidationError('Estoque mínimo não pode ser negativo');
    }
    
    await db.updateWarehouseItem(id, {
      name: data.name,
      description: data.description,
      unit: data.unit,
      category: data.category,
      minimumStock: data.minimumStock?.toString(),
      updatedBy: data.updatedBy ? Number(data.updatedBy) : undefined,
    });
  }
  
  async deleteItem(id: number): Promise<void> {
    const item = await this.getItemById(id);
    
    // Não permitir exclusão se houver estoque
    if (Number(item.currentStock) > 0) {
      throw new ValidationError(`Não é possível excluir item com estoque (${item.currentStock} ${item.unit})`);
    }
    
    // TODO: Implementar função de exclusão no db.ts
    throw new ValidationError('Função de exclusão não implementada');
  }
  
  // ==================== MOVIMENTAÇÕES ====================
  
  async listMovements(filters: MovementFilters): Promise<any[]> {
    if (filters.itemId) {
      return db.getWarehouseMovements(filters.itemId);
    }
    return [];
  }
  
  async createMovement(data: CreateMovementDTO): Promise<any> {
    const item = await this.getItemById(data.itemId);
    
    // Validar quantidade
    if (data.quantity <= 0) {
      throw new ValidationError('Quantidade deve ser maior que zero');
    }
    
    // Validar se há estoque suficiente para saída
    if (data.movementType === 'saida') {
      const available = Number(item.currentStock);
      if (data.quantity > available) {
        throw BusinessError.insufficientStock(item.name, available, data.quantity);
      }
    }
    
    // Calcular novo estoque
    let newStock = Number(item.currentStock);
    if (data.movementType === 'entrada') {
      newStock += data.quantity;
    } else if (data.movementType === 'saida') {
      newStock -= data.quantity;
    } else if (data.movementType === 'ajuste') {
      // Ajuste pode ser positivo ou negativo baseado na razão
      newStock = data.quantity; // Ajuste define o novo valor
    }
    
    // Criar movimentação
    const id = await db.createWarehouseMovement({
      warehouseItemId: data.itemId,
      movementType: data.movementType,
      quantity: data.quantity.toString(),
      reason: data.reason || 'Movimentação de estoque',
      createdBy: data.createdBy ? Number(data.createdBy) : undefined,
    });
    
    // Atualizar estoque do item
    await db.updateWarehouseItem(data.itemId, {
      currentStock: newStock.toString(),
    });
    
    return { id, newStock };
  }
  
  // ==================== PRODUTO ACABADO ====================
  
  async listFinishedGoods(filters: FinishedGoodsFilters): Promise<any[]> {
    return db.getFinishedGoodsInventory({
      skuId: filters.skuId,
      status: filters.status
    });
  }
  
  async getFinishedGoodsById(id: number): Promise<any> {
    // Buscar por ID na lista de produtos acabados
    const items = await db.getFinishedGoodsInventory({});
    const item = items.find((i: any) => i.id === id);
    if (!item) {
      throw new NotFoundError('Produto Acabado', id);
    }
    return item;
  }
  
  async createFinishedGoods(data: CreateFinishedGoodsDTO): Promise<any> {
    // Validar quantidade
    if (data.quantity <= 0) {
      throw new ValidationError('Quantidade deve ser maior que zero');
    }
    
    // Validar data de validade
    if (data.expirationDate <= data.productionDate) {
      throw new ValidationError('Data de validade deve ser posterior à data de produção');
    }
    
    const id = await db.createFinishedGoodsInventory({
      skuId: data.skuId,
      batchNumber: data.batchCode,
      quantity: data.quantity.toString(),
      productionDate: data.productionDate,
      expirationDate: data.expirationDate,
      status: 'disponivel',
      createdBy: data.createdBy ? Number(data.createdBy) : undefined,
    });
    
    return { id };
  }
  
  async reserveFinishedGoods(id: number, quantity: number, reservedBy?: string): Promise<void> {
    const item = await this.getFinishedGoodsById(id);
    
    if (item.status !== 'disponivel') {
      throw BusinessError.invalidStatusTransition('Produto Acabado', item.status, 'reservado');
    }
    
    const available = Number(item.quantity);
    if (quantity > available) {
      throw BusinessError.insufficientStock(item.batchCode, available, quantity);
    }
    
    await db.updateFinishedGoodsInventory(id, {
      status: 'reservado',
      updatedBy: reservedBy ? Number(reservedBy) : undefined,
    });
  }
  
  async shipFinishedGoods(id: number, quantity: number, shippedBy?: string): Promise<void> {
    const item = await this.getFinishedGoodsById(id);
    
    if (item.status !== 'reservado' && item.status !== 'disponivel') {
      throw BusinessError.invalidStatusTransition('Produto Acabado', item.status, 'expedido');
    }
    
    const available = Number(item.quantity);
    if (quantity > available) {
      throw BusinessError.insufficientStock(item.batchCode, available, quantity);
    }
    
    const newQuantity = available - quantity;
    
    await db.updateFinishedGoodsInventory(id, {
      quantity: newQuantity.toString(),
      status: newQuantity === 0 ? 'expedido' : item.status,
      updatedBy: shippedBy ? Number(shippedBy) : undefined,
    });
  }
  
  // ==================== ALERTAS E RELATÓRIOS ====================
  
  async getLowStockAlerts(): Promise<StockAlert[]> {
    const items = await db.getWarehouseItems({});
    
    return items
      .filter((item: any) => Number(item.currentStock) < Number(item.minimumStock))
      .map((item: any) => ({
        id: item.id,
        itemId: item.id,
        itemName: item.name,
        itemCode: item.internalCode,
        currentStock: Number(item.currentStock),
        minimumStock: Number(item.minimumStock),
        deficit: Number(item.minimumStock) - Number(item.currentStock),
        warehouseType: item.warehouseType
      }));
  }
  
  async getExpiringProducts(days: number): Promise<any[]> {
    const goods = await db.getFinishedGoodsInventory({ status: 'disponivel' });
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + days);
    
    return goods.filter((item: any) => {
      const expDate = new Date(item.expirationDate);
      return expDate <= limitDate;
    });
  }
  
  async getStockSummary(): Promise<StockSummary> {
    const items = await db.getWarehouseItems({});
    const lowStockAlerts = await this.getLowStockAlerts();
    // Contar movimentações de hoje (simplificado)
    const movements: any[] = [];
    
    return {
      totalItems: items.length,
      lowStockItems: lowStockAlerts.length,
      totalValue: 0, // TODO: calcular valor total
      movementsToday: movements.length
    };
  }
  
  // ==================== VALIDAÇÕES ====================
  
  async checkStockAvailability(itemId: number, quantity: number): Promise<boolean> {
    const item = await this.getItemById(itemId);
    return Number(item.currentStock) >= quantity;
  }
  
  async validateMovement(itemId: number, movementType: string, quantity: number): Promise<boolean> {
    if (quantity <= 0) return false;
    
    if (movementType === 'saida') {
      return this.checkStockAvailability(itemId, quantity);
    }
    
    return true;
  }
}

// Singleton para uso global
let stockServiceInstance: StockService | null = null;

export function getStockService(): StockService {
  if (!stockServiceInstance) {
    stockServiceInstance = new StockService();
  }
  return stockServiceInstance;
}
