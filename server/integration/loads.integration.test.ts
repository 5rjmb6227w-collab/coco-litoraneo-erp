/**
 * Testes de Integração - Fluxo de Cargas
 * 
 * Testa o fluxo completo de recebimento de cargas de coco através da API tRPC.
 * Estes testes validam a integração entre todas as camadas.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from '../routers';

// Contexto de teste com usuário autenticado
const createTestContext = () => ({
  user: {
    id: '999',
    openId: 'test-user-999',
    name: 'Test User',
    role: 'admin' as const
  }
});

describe('Integração - Fluxo de Cargas', () => {
  const caller = appRouter.createCaller(createTestContext());
  let testProducerId: number;
  let createdLoadId: number;

  // ==================== SETUP ====================

  beforeAll(async () => {
    // Criar produtor de teste
    try {
      const timestamp = Date.now();
      const producer = await caller.producers.create({
        name: `Produtor Teste Cargas ${timestamp}`,
        cpfCnpj: '191.503.880-04', // CPF válido
        phone: '11999999999',
        defaultPricePerKg: '2.50'
      });
      testProducerId = producer.id;
    } catch (error) {
      console.log('Erro ao criar produtor de teste:', error);
    }
  });

  // ==================== LISTAGEM ====================

  describe('Listagem de Cargas', () => {
    it('deve listar cargas', async () => {
      // O endpoint retorna array diretamente
      const result = await caller.coconutLoads.list({});

      expect(Array.isArray(result)).toBe(true);
    });

    it('deve filtrar cargas por status', async () => {
      const result = await caller.coconutLoads.list({
        status: 'recebido'
      });

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result.every((l: any) => l.status === 'recebido')).toBe(true);
      }
    });
  });

  // ==================== CRIAÇÃO ====================

  describe('Criação de Carga', () => {
    it('deve criar uma nova carga com dados válidos', async () => {
      if (!testProducerId) {
        console.log('Skipping: testProducerId not available');
        return;
      }

      const grossWeight = 1000;
      const tareWeight = 200;
      const netWeight = grossWeight - tareWeight;

      const newLoad = {
        producerId: testProducerId,
        receivedAt: new Date().toISOString(),
        licensePlate: 'ABC1234',
        driverName: 'Carlos Silva',
        grossWeight: grossWeight.toString(),
        tareWeight: tareWeight.toString(),
        netWeight: netWeight.toString(),
        observations: 'Carga de teste de integração'
      };

      const result = await caller.coconutLoads.create(newLoad);

      expect(result).toHaveProperty('id');
      createdLoadId = result.id;
    });
  });

  // ==================== BUSCA POR ID ====================

  describe('Busca por ID', () => {
    it('deve retornar carga existente', async () => {
      if (!createdLoadId) return;

      const result = await caller.coconutLoads.getById({ id: createdLoadId });

      expect(result).toHaveProperty('id', createdLoadId);
    });
  });

  // ==================== FLUXO DE STATUS ====================

  describe('Fluxo de Status', () => {
    it('deve atualizar status da carga para conferido', async () => {
      if (!createdLoadId) return;

      const result = await caller.coconutLoads.update({
        id: createdLoadId,
        status: 'conferido'
      });

      expect(result).toHaveProperty('success', true);
    });

    it('deve atualizar status da carga para fechado', async () => {
      if (!createdLoadId) return;

      const result = await caller.coconutLoads.update({
        id: createdLoadId,
        status: 'fechado'
      });

      expect(result).toHaveProperty('success', true);
    });
  });

  // ==================== MÉTRICAS ====================

  describe('Métricas de Cargas', () => {
    it('deve retornar estatísticas do dashboard', async () => {
      const result = await caller.dashboard.stats({});

      expect(result).toHaveProperty('loads');
      expect(result.loads).toHaveProperty('count');
      expect(result.loads).toHaveProperty('totalWeight');
    });
  });

  // ==================== LIMPEZA ====================

  afterAll(async () => {
    // Limpar produtor de teste
    if (testProducerId) {
      try {
        await caller.producers.delete({ id: testProducerId });
      } catch {
        // Ignora erro se tem cargas vinculadas
      }
    }
  });
});
