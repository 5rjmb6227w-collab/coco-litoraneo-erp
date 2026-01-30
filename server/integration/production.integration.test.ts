/**
 * Testes de Integração - Fluxo de Produção
 * 
 * Testa o fluxo completo de ordens de produção através da API tRPC.
 * Estes testes validam a integração entre todas as camadas.
 */

import { describe, it, expect, beforeAll } from 'vitest';
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

describe('Integração - Fluxo de Produção', () => {
  const caller = appRouter.createCaller(createTestContext());
  let testSkuId: number;

  // ==================== SETUP ====================

  beforeAll(async () => {
    // Buscar um SKU existente para usar nos testes
    try {
      const skus = await caller.skus.list({ page: 1, limit: 1 });
      if (skus.data.length > 0) {
        testSkuId = skus.data[0].id;
      }
    } catch {
      console.log('Não foi possível buscar SKUs para teste');
    }
  });

  // ==================== LISTAGEM DE ORDENS ====================

  describe('Listagem de Ordens de Produção', () => {
    it('deve listar ordens de produção', async () => {
      // O endpoint retorna array diretamente
      const result = await caller.production.orders.list({});

      expect(Array.isArray(result)).toBe(true);
    });

    it('deve filtrar ordens por status', async () => {
      const result = await caller.production.orders.list({
        status: 'planejado'
      });

      expect(Array.isArray(result)).toBe(true);
      // Se houver dados, todos devem ter o status correto
      if (result.length > 0) {
        expect(result.every((o: any) => o.status === 'planejado')).toBe(true);
      }
    });
  });

  // ==================== CRIAÇÃO DE ORDEM ====================

  describe('Criação de Ordem de Produção', () => {
    it('deve criar uma nova ordem de produção', async () => {
      if (!testSkuId) {
        console.log('Skipping: testSkuId not available');
        return;
      }

      const newOrder = {
        skuId: testSkuId,
        variation: 'flocos' as const,
        plannedQuantity: 100,
        plannedStartDate: new Date().toISOString(),
        observations: 'Ordem de teste de integração'
      };

      const result = await caller.production.orders.create(newOrder);

      expect(result).toHaveProperty('id');
    });
  });

  // ==================== APONTAMENTOS ====================

  describe('Apontamentos de Produção', () => {
    it('deve listar apontamentos de produção', async () => {
      // O endpoint retorna array diretamente
      const result = await caller.production.entries.list({});

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ==================== PROBLEMAS DE PRODUÇÃO ====================

  describe('Problemas de Produção', () => {
    it('deve listar problemas de produção', async () => {
      // O endpoint retorna array diretamente
      const result = await caller.production.issues.list({});

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ==================== PARADAS DE PRODUÇÃO ====================

  describe('Paradas de Produção', () => {
    it('deve listar paradas ativas', async () => {
      const result = await caller.production.stops.listActive({});

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ==================== METAS DE PRODUÇÃO ====================

  describe('Metas de Produção', () => {
    it('deve listar metas de produção', async () => {
      const result = await caller.production.goals.list({
        page: 1,
        limit: 10
      });

      // O endpoint retorna array diretamente
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ==================== MÉTRICAS DO DASHBOARD ====================

  describe('Métricas do Dashboard', () => {
    it('deve retornar estatísticas do dashboard', async () => {
      const result = await caller.dashboard.stats({});

      // Verificar estrutura real do dashboard
      expect(result).toHaveProperty('production');
      expect(result).toHaveProperty('loads');
      expect(result).toHaveProperty('payables');
      expect(result).toHaveProperty('purchases');
      expect(result).toHaveProperty('ncs');
      expect(result).toHaveProperty('producers');
    });

    it('deve retornar métricas de OEE', async () => {
      const result = await caller.dashboard.oeeMetrics({});

      // Verificar estrutura real de OEE (em inglês)
      expect(result).toHaveProperty('oee');
      expect(result).toHaveProperty('availability');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('quality');
      expect(result).toHaveProperty('totalProduced');
      expect(result).toHaveProperty('totalLosses');
    });

    it('deve retornar histórico de OEE', async () => {
      const result = await caller.dashboard.oeeHistory({ days: 7 });

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
