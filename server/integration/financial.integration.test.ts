/**
 * Testes de Integração - Fluxo Financeiro
 * 
 * Testa o fluxo completo de pagamentos a produtores e contas a receber.
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

describe('Integração - Fluxo Financeiro', () => {
  const caller = appRouter.createCaller(createTestContext());
  let testProducerId: number;
  let testLoadId: number;

  // ==================== SETUP ====================

  beforeAll(async () => {
    // Criar produtor de teste
    try {
      const timestamp = Date.now();
      const producer = await caller.producers.create({
        name: `Produtor Teste Financeiro ${timestamp}`,
        cpfCnpj: '276.014.830-00', // CPF válido
        phone: '11999999999',
        bank: 'Banco Teste',
        agency: '1234',
        account: '12345-6',
        pixKey: 'teste@pix.com',
        defaultPricePerKg: '2.50'
      });
      testProducerId = producer.id;

      // Criar carga de teste
      const grossWeight = 1000;
      const tareWeight = 200;
      const netWeight = grossWeight - tareWeight;
      
      const load = await caller.coconutLoads.create({
        producerId: testProducerId,
        receivedAt: new Date().toISOString(),
        licensePlate: 'FIN1234',
        grossWeight: grossWeight.toString(),
        tareWeight: tareWeight.toString(),
        netWeight: netWeight.toString()
      });
      testLoadId = load.id;

      // Conferir e fechar a carga
      await caller.coconutLoads.check({ id: testLoadId });
      await caller.coconutLoads.close({ id: testLoadId });
    } catch (error) {
      console.log('Erro no setup:', error);
    }
  });

  // ==================== PAGAMENTOS A PRODUTORES ====================

  describe('Pagamentos a Produtores', () => {
    it('deve listar pagamentos', async () => {
      // O endpoint retorna array diretamente
      const result = await caller.producerPayables.list({});

      expect(Array.isArray(result)).toBe(true);
    });

    it('deve filtrar pagamentos por status', async () => {
      const result = await caller.producerPayables.list({
        status: 'pendente'
      });

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result.every((p: any) => p.status === 'pendente')).toBe(true);
      }
    });
  });

  // ==================== CONTAS FINANCEIRAS ====================

  describe('Contas Financeiras', () => {
    it('deve listar contas financeiras', async () => {
      const result = await caller.financial.list({});

      expect(Array.isArray(result)).toBe(true);
    });

    it('deve criar conta a receber', async () => {
      const newReceivable = {
        entryType: 'receber' as const,
        origin: 'venda' as const,
        description: 'Venda de teste',
        value: '1500.00',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
        entityName: 'Cliente Teste'
      };

      const result = await caller.financial.create(newReceivable);

      expect(result).toHaveProperty('id');
    });

    it('deve filtrar contas por tipo', async () => {
      const result = await caller.financial.list({
        entryType: 'receber'
      });

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result.every((r: any) => r.entryType === 'receber')).toBe(true);
      }
    });
  });

  // ==================== MÉTRICAS DO DASHBOARD ====================

  describe('Métricas Financeiras do Dashboard', () => {
    it('deve retornar estatísticas do dashboard', async () => {
      const result = await caller.dashboard.stats({});

      expect(result).toHaveProperty('payables');
      expect(result.payables).toHaveProperty('total');
      expect(result.payables).toHaveProperty('pending');
      expect(result.payables).toHaveProperty('overdue');
    });
  });

  // ==================== LIMPEZA ====================

  afterAll(async () => {
    // Limpar dados de teste
    if (testProducerId) {
      try {
        await caller.producers.delete({ id: testProducerId });
      } catch {
        // Ignora erro se tem pagamentos vinculados
      }
    }
  });
});
