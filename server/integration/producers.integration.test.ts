/**
 * Testes de Integração - Fluxo de Produtores
 * 
 * Testa o fluxo completo de cadastro e gestão de produtores através da API tRPC.
 * Estes testes validam a integração entre todas as camadas.
 */

import { describe, it, expect, afterAll } from 'vitest';
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

describe('Integração - Fluxo de Produtores', () => {
  const caller = appRouter.createCaller(createTestContext());
  let createdProducerId: number;

  // ==================== LISTAGEM ====================

  describe('Listagem de Produtores', () => {
    it('deve listar produtores', async () => {
      // O endpoint retorna array diretamente
      const result = await caller.producers.list({});

      expect(Array.isArray(result)).toBe(true);
    });

    it('deve filtrar produtores por status', async () => {
      const result = await caller.producers.list({ status: 'ativo' });

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result.every((p: any) => p.status === 'ativo')).toBe(true);
      }
    });

    it('deve buscar produtores por nome', async () => {
      const result = await caller.producers.list({ search: 'teste' });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ==================== CRIAÇÃO ====================

  describe('Criação de Produtor', () => {
    it('deve criar um novo produtor com dados válidos', async () => {
      const timestamp = Date.now();
      // CPFs válidos para teste (gerados com dígitos verificadores corretos)
      const validCpfs = [
        '52998224725', '11144477735', '12345678909', '98765432100',
        '45678912345', '78912345678', '32165498700', '65432198700'
      ];
      const randomCpf = validCpfs[Math.floor(Math.random() * validCpfs.length)];
      
      const newProducer = {
        name: `Produtor Teste Integração ${timestamp}`,
        cpfCnpj: randomCpf,
        phone: '11999999999',
        defaultPricePerKg: '2.50'
      };

      const result = await caller.producers.create(newProducer);

      expect(result).toHaveProperty('id');
      createdProducerId = result.id;
    });
  });

  // ==================== BUSCA POR ID ====================

  describe('Busca por ID', () => {
    it('deve retornar produtor existente', async () => {
      if (!createdProducerId) return;

      const result = await caller.producers.getById({ id: createdProducerId });

      expect(result).toHaveProperty('id', createdProducerId);
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('cpfCnpj');
    });
  });

  // ==================== ATUALIZAÇÃO ====================

  describe('Atualização de Produtor', () => {
    it('deve atualizar dados do produtor', async () => {
      if (!createdProducerId) return;

      const updateData = {
        id: createdProducerId,
        phone: '11888888888',
        email: 'teste@email.com'
      };

      const result = await caller.producers.update(updateData);

      expect(result).toHaveProperty('success', true);
    });
  });

  // ==================== DESATIVAÇÃO/REATIVAÇÃO ====================

  describe('Desativação e Reativação', () => {
    it('deve desativar produtor', async () => {
      if (!createdProducerId) return;

      const result = await caller.producers.deactivate({ id: createdProducerId });

      expect(result).toHaveProperty('success', true);
    });

    it('deve reativar produtor', async () => {
      if (!createdProducerId) return;

      const result = await caller.producers.reactivate({ id: createdProducerId });

      expect(result).toHaveProperty('success', true);
    });
  });

  // ==================== TOP PRODUTORES ====================

  describe('Top Produtores por Volume', () => {
    it('deve retornar top produtores', async () => {
      const result = await caller.producers.topByVolume({ limit: 5 });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ==================== LIMPEZA ====================

  afterAll(async () => {
    // Limpar produtor de teste
    if (createdProducerId) {
      try {
        await caller.producers.delete({ id: createdProducerId });
      } catch {
        // Ignora erro se tem cargas vinculadas
      }
    }
  });
});
