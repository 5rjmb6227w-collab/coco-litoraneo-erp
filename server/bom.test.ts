import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do módulo db
vi.mock('./db', () => ({
  getBomItemsBySkuId: vi.fn(),
  createBomItem: vi.fn(),
  updateBomItem: vi.fn(),
  deleteBomItem: vi.fn(),
  getBomItemById: vi.fn(),
}));

import * as db from './db';

describe('BOM Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBomItemsBySkuId', () => {
    it('deve retornar lista vazia quando não há itens', async () => {
      vi.mocked(db.getBomItemsBySkuId).mockResolvedValue([]);
      
      const result = await db.getBomItemsBySkuId(1);
      
      expect(result).toEqual([]);
      expect(db.getBomItemsBySkuId).toHaveBeenCalledWith(1);
    });

    it('deve retornar itens da BOM para um SKU', async () => {
      const mockItems = [
        {
          id: 1,
          skuId: 1,
          itemId: 10,
          itemType: 'materia_prima' as const,
          itemName: 'Coco Verde',
          quantityPerUnit: '10.0000',
          unit: 'un',
          wastagePercent: '5.00',
          isOptional: false,
          observations: null,
          createdAt: new Date(),
          createdBy: 1,
          updatedAt: new Date(),
          updatedBy: null,
        },
        {
          id: 2,
          skuId: 1,
          itemId: 11,
          itemType: 'embalagem' as const,
          itemName: 'Garrafa PET 500ml',
          quantityPerUnit: '1.0000',
          unit: 'un',
          wastagePercent: '2.00',
          isOptional: false,
          observations: null,
          createdAt: new Date(),
          createdBy: 1,
          updatedAt: new Date(),
          updatedBy: null,
        },
      ];
      
      vi.mocked(db.getBomItemsBySkuId).mockResolvedValue(mockItems);
      
      const result = await db.getBomItemsBySkuId(1);
      
      expect(result).toHaveLength(2);
      expect(result[0].itemName).toBe('Coco Verde');
      expect(result[1].itemName).toBe('Garrafa PET 500ml');
    });
  });

  describe('createBomItem', () => {
    it('deve criar um novo item na BOM', async () => {
      const newItem = {
        skuId: 1,
        itemId: 10,
        itemType: 'materia_prima' as const,
        itemName: 'Açúcar',
        quantityPerUnit: '0.5000',
        unit: 'kg',
        wastagePercent: '0.00',
        isOptional: false,
        observations: 'Açúcar refinado',
        createdBy: 1,
      };
      
      const createdItem = {
        id: 3,
        ...newItem,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: null,
      };
      
      vi.mocked(db.createBomItem).mockResolvedValue(createdItem);
      
      const result = await db.createBomItem(newItem);
      
      expect(result.id).toBe(3);
      expect(result.itemName).toBe('Açúcar');
      expect(db.createBomItem).toHaveBeenCalledWith(newItem);
    });

    it('deve criar item com tipo embalagem', async () => {
      const newItem = {
        skuId: 2,
        itemId: 20,
        itemType: 'embalagem' as const,
        itemName: 'Caixa de Papelão',
        quantityPerUnit: '1.0000',
        unit: 'un',
        createdBy: 1,
      };
      
      const createdItem = {
        id: 4,
        ...newItem,
        wastagePercent: '0.00',
        isOptional: false,
        observations: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: null,
      };
      
      vi.mocked(db.createBomItem).mockResolvedValue(createdItem);
      
      const result = await db.createBomItem(newItem);
      
      expect(result.itemType).toBe('embalagem');
    });

    it('deve criar item opcional', async () => {
      const newItem = {
        skuId: 1,
        itemId: 15,
        itemType: 'insumo' as const,
        itemName: 'Corante Natural',
        quantityPerUnit: '0.0010',
        unit: 'kg',
        isOptional: true,
        createdBy: 1,
      };
      
      const createdItem = {
        id: 5,
        ...newItem,
        wastagePercent: '0.00',
        observations: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: null,
      };
      
      vi.mocked(db.createBomItem).mockResolvedValue(createdItem);
      
      const result = await db.createBomItem(newItem);
      
      expect(result.isOptional).toBe(true);
    });
  });

  describe('updateBomItem', () => {
    it('deve atualizar quantidade de um item', async () => {
      const updatedItem = {
        id: 1,
        skuId: 1,
        itemId: 10,
        itemType: 'materia_prima' as const,
        itemName: 'Coco Verde',
        quantityPerUnit: '15.0000',
        unit: 'un',
        wastagePercent: '5.00',
        isOptional: false,
        observations: null,
        createdAt: new Date(),
        createdBy: 1,
        updatedAt: new Date(),
        updatedBy: 2,
      };
      
      vi.mocked(db.updateBomItem).mockResolvedValue(updatedItem);
      
      const result = await db.updateBomItem(1, { quantityPerUnit: '15.0000', updatedBy: 2 });
      
      expect(result.quantityPerUnit).toBe('15.0000');
      expect(db.updateBomItem).toHaveBeenCalledWith(1, { quantityPerUnit: '15.0000', updatedBy: 2 });
    });

    it('deve atualizar percentual de perda', async () => {
      const updatedItem = {
        id: 1,
        skuId: 1,
        itemId: 10,
        itemType: 'materia_prima' as const,
        itemName: 'Coco Verde',
        quantityPerUnit: '10.0000',
        unit: 'un',
        wastagePercent: '8.50',
        isOptional: false,
        observations: null,
        createdAt: new Date(),
        createdBy: 1,
        updatedAt: new Date(),
        updatedBy: 2,
      };
      
      vi.mocked(db.updateBomItem).mockResolvedValue(updatedItem);
      
      const result = await db.updateBomItem(1, { wastagePercent: '8.50' });
      
      expect(result.wastagePercent).toBe('8.50');
    });

    it('deve marcar item como opcional', async () => {
      const updatedItem = {
        id: 2,
        skuId: 1,
        itemId: 11,
        itemType: 'embalagem' as const,
        itemName: 'Garrafa PET 500ml',
        quantityPerUnit: '1.0000',
        unit: 'un',
        wastagePercent: '2.00',
        isOptional: true,
        observations: 'Pode usar garrafa de vidro como alternativa',
        createdAt: new Date(),
        createdBy: 1,
        updatedAt: new Date(),
        updatedBy: 2,
      };
      
      vi.mocked(db.updateBomItem).mockResolvedValue(updatedItem);
      
      const result = await db.updateBomItem(2, { isOptional: true, observations: 'Pode usar garrafa de vidro como alternativa' });
      
      expect(result.isOptional).toBe(true);
      expect(result.observations).toBe('Pode usar garrafa de vidro como alternativa');
    });
  });

  describe('deleteBomItem', () => {
    it('deve deletar um item da BOM', async () => {
      vi.mocked(db.deleteBomItem).mockResolvedValue({ success: true });
      
      const result = await db.deleteBomItem(1);
      
      expect(result.success).toBe(true);
      expect(db.deleteBomItem).toHaveBeenCalledWith(1);
    });
  });

  describe('getBomItemById', () => {
    it('deve retornar um item específico', async () => {
      const mockItem = {
        id: 1,
        skuId: 1,
        itemId: 10,
        itemType: 'materia_prima' as const,
        itemName: 'Coco Verde',
        quantityPerUnit: '10.0000',
        unit: 'un',
        wastagePercent: '5.00',
        isOptional: false,
        observations: null,
        createdAt: new Date(),
        createdBy: 1,
        updatedAt: new Date(),
        updatedBy: null,
      };
      
      vi.mocked(db.getBomItemById).mockResolvedValue(mockItem);
      
      const result = await db.getBomItemById(1);
      
      expect(result?.id).toBe(1);
      expect(result?.itemName).toBe('Coco Verde');
    });

    it('deve retornar null quando item não existe', async () => {
      vi.mocked(db.getBomItemById).mockResolvedValue(null);
      
      const result = await db.getBomItemById(999);
      
      expect(result).toBeNull();
    });
  });

  describe('Validações de tipos de item', () => {
    it('deve aceitar tipo materia_prima', async () => {
      const item = {
        skuId: 1,
        itemId: 10,
        itemType: 'materia_prima' as const,
        itemName: 'Coco',
        quantityPerUnit: '1.0000',
        unit: 'kg',
        createdBy: 1,
      };
      
      vi.mocked(db.createBomItem).mockResolvedValue({
        id: 1,
        ...item,
        wastagePercent: '0.00',
        isOptional: false,
        observations: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: null,
      });
      
      const result = await db.createBomItem(item);
      expect(result.itemType).toBe('materia_prima');
    });

    it('deve aceitar tipo embalagem', async () => {
      const item = {
        skuId: 1,
        itemId: 20,
        itemType: 'embalagem' as const,
        itemName: 'Garrafa',
        quantityPerUnit: '1.0000',
        unit: 'un',
        createdBy: 1,
      };
      
      vi.mocked(db.createBomItem).mockResolvedValue({
        id: 2,
        ...item,
        wastagePercent: '0.00',
        isOptional: false,
        observations: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: null,
      });
      
      const result = await db.createBomItem(item);
      expect(result.itemType).toBe('embalagem');
    });

    it('deve aceitar tipo insumo', async () => {
      const item = {
        skuId: 1,
        itemId: 30,
        itemType: 'insumo' as const,
        itemName: 'Conservante',
        quantityPerUnit: '0.0100',
        unit: 'kg',
        createdBy: 1,
      };
      
      vi.mocked(db.createBomItem).mockResolvedValue({
        id: 3,
        ...item,
        wastagePercent: '0.00',
        isOptional: false,
        observations: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: null,
      });
      
      const result = await db.createBomItem(item);
      expect(result.itemType).toBe('insumo');
    });
  });
});
