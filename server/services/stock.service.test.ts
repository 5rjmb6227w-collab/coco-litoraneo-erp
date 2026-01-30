/**
 * Testes unitários para o StockService.
 * Testa a lógica de negócio de estoque com mocks dos repositories.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StockService } from './stock.service';
import { NotFoundError, ValidationError, BusinessError } from '../errors';
import * as db from '../db';

// Mock do módulo db
vi.mock('../db', () => ({
  getWarehouseItems: vi.fn(),
  getWarehouseItemById: vi.fn(),
  createWarehouseItem: vi.fn(),
  updateWarehouseItem: vi.fn(),
  getWarehouseMovements: vi.fn(),
  createWarehouseMovement: vi.fn(),
  getFinishedGoodsInventory: vi.fn(),
  createFinishedGoodsInventory: vi.fn(),
  updateFinishedGoodsInventory: vi.fn(),
}));

describe('StockService', () => {
  let service: StockService;

  beforeEach(() => {
    service = new StockService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== ITENS DE ALMOXARIFADO ====================

  describe('listItems', () => {
    it('deve listar itens de almoxarifado', async () => {
      const mockItems = [
        { id: 1, name: 'Embalagem 500ml', currentStock: 1000 },
        { id: 2, name: 'Rótulo', currentStock: 5000 },
      ];
      vi.mocked(db.getWarehouseItems).mockResolvedValue(mockItems);

      const result = await service.listItems({});

      expect(result).toEqual(mockItems);
    });

    it('deve filtrar por tipo de almoxarifado', async () => {
      vi.mocked(db.getWarehouseItems).mockResolvedValue([]);

      await service.listItems({ warehouseType: 'embalagens' });

      expect(db.getWarehouseItems).toHaveBeenCalledWith({
        warehouseType: 'embalagens',
        category: undefined,
        search: undefined,
      });
    });
  });

  describe('getItemById', () => {
    it('deve retornar item existente', async () => {
      const mockItem = { id: 1, name: 'Embalagem 500ml', currentStock: 1000 };
      vi.mocked(db.getWarehouseItemById).mockResolvedValue(mockItem);

      const result = await service.getItemById(1);

      expect(result).toEqual(mockItem);
    });

    it('deve lançar NotFoundError se não encontrar', async () => {
      vi.mocked(db.getWarehouseItemById).mockResolvedValue(null);

      await expect(service.getItemById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getItemByCode', () => {
    it('deve retornar item pelo código interno', async () => {
      const mockItems = [
        { id: 1, internalCode: 'EMB-001', name: 'Embalagem' },
        { id: 2, internalCode: 'ROT-001', name: 'Rótulo' },
      ];
      vi.mocked(db.getWarehouseItems).mockResolvedValue(mockItems);

      const result = await service.getItemByCode('EMB-001');

      expect(result?.id).toBe(1);
    });

    it('deve retornar null se não encontrar', async () => {
      vi.mocked(db.getWarehouseItems).mockResolvedValue([]);

      const result = await service.getItemByCode('XXX-999');

      expect(result).toBeNull();
    });
  });

  describe('createItem', () => {
    it('deve criar item com dados válidos', async () => {
      vi.mocked(db.getWarehouseItems).mockResolvedValue([]);
      vi.mocked(db.createWarehouseItem).mockResolvedValue(1);

      const result = await service.createItem({
        internalCode: 'EMB-001',
        name: 'Embalagem 500ml',
        unit: 'un',
        warehouseType: 'embalagens',
        minimumStock: 100,
      });

      expect(result).toEqual({ id: 1 });
    });

    it('deve lançar ValidationError se código já existir', async () => {
      vi.mocked(db.getWarehouseItems).mockResolvedValue([
        { id: 1, internalCode: 'EMB-001', name: 'Existente' },
      ]);

      await expect(
        service.createItem({
          internalCode: 'EMB-001',
          name: 'Nova Embalagem',
          unit: 'un',
          warehouseType: 'embalagens',
          minimumStock: 100,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('deve lançar ValidationError se estoque mínimo for negativo', async () => {
      vi.mocked(db.getWarehouseItems).mockResolvedValue([]);

      await expect(
        service.createItem({
          internalCode: 'EMB-002',
          name: 'Embalagem',
          unit: 'un',
          warehouseType: 'embalagens',
          minimumStock: -10,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateItem', () => {
    it('deve atualizar item existente', async () => {
      const mockItem = { id: 1, name: 'Embalagem', currentStock: 100 };
      vi.mocked(db.getWarehouseItemById).mockResolvedValue(mockItem);
      vi.mocked(db.updateWarehouseItem).mockResolvedValue(undefined);

      await service.updateItem(1, { name: 'Embalagem 500ml' });

      expect(db.updateWarehouseItem).toHaveBeenCalledWith(1, expect.objectContaining({
        name: 'Embalagem 500ml',
      }));
    });

    it('deve lançar ValidationError se estoque mínimo for negativo', async () => {
      const mockItem = { id: 1, name: 'Embalagem', currentStock: 100 };
      vi.mocked(db.getWarehouseItemById).mockResolvedValue(mockItem);

      await expect(
        service.updateItem(1, { minimumStock: -5 })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteItem', () => {
    it('deve lançar ValidationError se houver estoque', async () => {
      const mockItem = { id: 1, name: 'Embalagem', currentStock: 50, unit: 'un' };
      vi.mocked(db.getWarehouseItemById).mockResolvedValue(mockItem);

      await expect(service.deleteItem(1)).rejects.toThrow(ValidationError);
    });
  });

  // ==================== MOVIMENTAÇÕES ====================

  describe('listMovements', () => {
    it('deve listar movimentações de um item', async () => {
      const mockMovements = [
        { id: 1, movementType: 'entrada', quantity: 100 },
        { id: 2, movementType: 'saida', quantity: 20 },
      ];
      vi.mocked(db.getWarehouseMovements).mockResolvedValue(mockMovements);

      const result = await service.listMovements({ itemId: 1 });

      expect(result).toEqual(mockMovements);
    });

    it('deve retornar array vazio se não tiver itemId', async () => {
      const result = await service.listMovements({});

      expect(result).toEqual([]);
    });
  });

  describe('createMovement', () => {
    it('deve criar movimentação de entrada', async () => {
      const mockItem = { id: 1, name: 'Embalagem', currentStock: '100' };
      vi.mocked(db.getWarehouseItemById).mockResolvedValue(mockItem);
      vi.mocked(db.createWarehouseMovement).mockResolvedValue(1);
      vi.mocked(db.updateWarehouseItem).mockResolvedValue(undefined);

      const result = await service.createMovement({
        itemId: 1,
        movementType: 'entrada',
        quantity: 50,
        reason: 'Compra',
      });

      expect(result).toEqual({ id: 1, newStock: 150 });
      expect(db.updateWarehouseItem).toHaveBeenCalledWith(1, {
        currentStock: '150',
      });
    });

    it('deve criar movimentação de saída', async () => {
      const mockItem = { id: 1, name: 'Embalagem', currentStock: '100' };
      vi.mocked(db.getWarehouseItemById).mockResolvedValue(mockItem);
      vi.mocked(db.createWarehouseMovement).mockResolvedValue(1);
      vi.mocked(db.updateWarehouseItem).mockResolvedValue(undefined);

      const result = await service.createMovement({
        itemId: 1,
        movementType: 'saida',
        quantity: 30,
        reason: 'Produção',
      });

      expect(result).toEqual({ id: 1, newStock: 70 });
    });

    it('deve lançar ValidationError se quantidade for zero', async () => {
      const mockItem = { id: 1, name: 'Embalagem', currentStock: '100' };
      vi.mocked(db.getWarehouseItemById).mockResolvedValue(mockItem);

      await expect(
        service.createMovement({
          itemId: 1,
          movementType: 'entrada',
          quantity: 0,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('deve lançar BusinessError se não houver estoque suficiente para saída', async () => {
      const mockItem = { id: 1, name: 'Embalagem', currentStock: '50' };
      vi.mocked(db.getWarehouseItemById).mockResolvedValue(mockItem);

      await expect(
        service.createMovement({
          itemId: 1,
          movementType: 'saida',
          quantity: 100,
        })
      ).rejects.toThrow(BusinessError);
    });
  });

  // ==================== PRODUTO ACABADO ====================

  describe('listFinishedGoods', () => {
    it('deve listar produtos acabados', async () => {
      const mockGoods = [
        { id: 1, batchNumber: 'LOTE-001', quantity: 500 },
        { id: 2, batchNumber: 'LOTE-002', quantity: 300 },
      ];
      vi.mocked(db.getFinishedGoodsInventory).mockResolvedValue(mockGoods);

      const result = await service.listFinishedGoods({});

      expect(result).toEqual(mockGoods);
    });
  });

  describe('getFinishedGoodsById', () => {
    it('deve retornar produto acabado existente', async () => {
      const mockGoods = [
        { id: 1, batchNumber: 'LOTE-001', quantity: 500 },
        { id: 2, batchNumber: 'LOTE-002', quantity: 300 },
      ];
      vi.mocked(db.getFinishedGoodsInventory).mockResolvedValue(mockGoods);

      const result = await service.getFinishedGoodsById(1);

      expect(result.id).toBe(1);
    });

    it('deve lançar NotFoundError se não encontrar', async () => {
      vi.mocked(db.getFinishedGoodsInventory).mockResolvedValue([]);

      await expect(service.getFinishedGoodsById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createFinishedGoods', () => {
    it('deve criar produto acabado', async () => {
      vi.mocked(db.createFinishedGoodsInventory).mockResolvedValue(1);

      const result = await service.createFinishedGoods({
        skuId: 1,
        batchCode: 'LOTE-001',
        quantity: 500,
        productionDate: '2026-01-30',
        expirationDate: '2026-07-30',
      });

      expect(result).toEqual({ id: 1 });
    });

    it('deve lançar ValidationError se quantidade for zero', async () => {
      await expect(
        service.createFinishedGoods({
          skuId: 1,
          batchCode: 'LOTE-001',
          quantity: 0,
          productionDate: '2026-01-30',
          expirationDate: '2026-07-30',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('deve lançar ValidationError se validade for anterior à produção', async () => {
      await expect(
        service.createFinishedGoods({
          skuId: 1,
          batchCode: 'LOTE-001',
          quantity: 500,
          productionDate: '2026-07-30',
          expirationDate: '2026-01-30',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('reserveFinishedGoods', () => {
    it('deve reservar produto disponível', async () => {
      const mockGoods = [
        { id: 1, batchCode: 'LOTE-001', quantity: '500', status: 'disponivel' },
      ];
      vi.mocked(db.getFinishedGoodsInventory).mockResolvedValue(mockGoods);
      vi.mocked(db.updateFinishedGoodsInventory).mockResolvedValue(undefined);

      await service.reserveFinishedGoods(1, 100);

      expect(db.updateFinishedGoodsInventory).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'reservado',
      }));
    });

    it('deve lançar BusinessError se status não for disponível', async () => {
      const mockGoods = [
        { id: 1, batchCode: 'LOTE-001', quantity: '500', status: 'expedido' },
      ];
      vi.mocked(db.getFinishedGoodsInventory).mockResolvedValue(mockGoods);

      await expect(
        service.reserveFinishedGoods(1, 100)
      ).rejects.toThrow(BusinessError);
    });

    it('deve lançar BusinessError se quantidade exceder disponível', async () => {
      const mockGoods = [
        { id: 1, batchCode: 'LOTE-001', quantity: '100', status: 'disponivel' },
      ];
      vi.mocked(db.getFinishedGoodsInventory).mockResolvedValue(mockGoods);

      await expect(
        service.reserveFinishedGoods(1, 200)
      ).rejects.toThrow(BusinessError);
    });
  });

  describe('shipFinishedGoods', () => {
    it('deve expedir produto reservado', async () => {
      const mockGoods = [
        { id: 1, batchCode: 'LOTE-001', quantity: '500', status: 'reservado' },
      ];
      vi.mocked(db.getFinishedGoodsInventory).mockResolvedValue(mockGoods);
      vi.mocked(db.updateFinishedGoodsInventory).mockResolvedValue(undefined);

      await service.shipFinishedGoods(1, 200);

      expect(db.updateFinishedGoodsInventory).toHaveBeenCalledWith(1, expect.objectContaining({
        quantity: '300',
      }));
    });

    it('deve marcar como expedido se quantidade zerar', async () => {
      const mockGoods = [
        { id: 1, batchCode: 'LOTE-001', quantity: '100', status: 'reservado' },
      ];
      vi.mocked(db.getFinishedGoodsInventory).mockResolvedValue(mockGoods);
      vi.mocked(db.updateFinishedGoodsInventory).mockResolvedValue(undefined);

      await service.shipFinishedGoods(1, 100);

      expect(db.updateFinishedGoodsInventory).toHaveBeenCalledWith(1, expect.objectContaining({
        quantity: '0',
        status: 'expedido',
      }));
    });
  });

  // ==================== ALERTAS E RELATÓRIOS ====================

  describe('getLowStockAlerts', () => {
    it('deve retornar itens com estoque baixo', async () => {
      const mockItems = [
        { id: 1, name: 'Item A', internalCode: 'A', currentStock: '50', minimumStock: '100', warehouseType: 'embalagens' },
        { id: 2, name: 'Item B', internalCode: 'B', currentStock: '200', minimumStock: '100', warehouseType: 'insumos' },
      ];
      vi.mocked(db.getWarehouseItems).mockResolvedValue(mockItems);

      const result = await service.getLowStockAlerts();

      expect(result.length).toBe(1);
      expect(result[0].itemName).toBe('Item A');
      expect(result[0].deficit).toBe(50);
    });
  });

  describe('getExpiringProducts', () => {
    it('deve retornar produtos próximos do vencimento', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      
      const farFutureDate = new Date();
      farFutureDate.setDate(farFutureDate.getDate() + 60);
      
      const mockGoods = [
        { id: 1, expirationDate: futureDate.toISOString() },
        { id: 2, expirationDate: farFutureDate.toISOString() },
      ];
      vi.mocked(db.getFinishedGoodsInventory).mockResolvedValue(mockGoods);

      const result = await service.getExpiringProducts(30);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('getStockSummary', () => {
    it('deve retornar resumo do estoque', async () => {
      const mockItems = [
        { id: 1, currentStock: '50', minimumStock: '100' },
        { id: 2, currentStock: '200', minimumStock: '100' },
      ];
      vi.mocked(db.getWarehouseItems).mockResolvedValue(mockItems);

      const result = await service.getStockSummary();

      expect(result.totalItems).toBe(2);
      expect(result.lowStockItems).toBe(1);
    });
  });

  // ==================== VALIDAÇÕES ====================

  describe('checkStockAvailability', () => {
    it('deve retornar true se houver estoque suficiente', async () => {
      const mockItem = { id: 1, currentStock: '100' };
      vi.mocked(db.getWarehouseItemById).mockResolvedValue(mockItem);

      const result = await service.checkStockAvailability(1, 50);

      expect(result).toBe(true);
    });

    it('deve retornar false se não houver estoque suficiente', async () => {
      const mockItem = { id: 1, currentStock: '30' };
      vi.mocked(db.getWarehouseItemById).mockResolvedValue(mockItem);

      const result = await service.checkStockAvailability(1, 50);

      expect(result).toBe(false);
    });
  });

  describe('validateMovement', () => {
    it('deve validar entrada com qualquer quantidade positiva', async () => {
      const result = await service.validateMovement(1, 'entrada', 100);

      expect(result).toBe(true);
    });

    it('deve invalidar quantidade zero ou negativa', async () => {
      expect(await service.validateMovement(1, 'entrada', 0)).toBe(false);
      expect(await service.validateMovement(1, 'entrada', -10)).toBe(false);
    });

    it('deve validar saída apenas se houver estoque', async () => {
      const mockItem = { id: 1, currentStock: '100' };
      vi.mocked(db.getWarehouseItemById).mockResolvedValue(mockItem);

      expect(await service.validateMovement(1, 'saida', 50)).toBe(true);
      expect(await service.validateMovement(1, 'saida', 150)).toBe(false);
    });
  });
});
