/**
 * Testes unitários para o FinancialService.
 * Testa a lógica de negócio financeira com mocks dos repositories.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FinancialService } from './financial.service';
import { NotFoundError, ValidationError, BusinessError } from '../errors';
import * as db from '../db';

// Mock do módulo db
vi.mock('../db', () => ({
  getProducerPayables: vi.fn(),
  getProducerPayableById: vi.fn(),
  getProducerById: vi.fn(),
  createFinancialEntry: vi.fn(),
  updateProducerPayable: vi.fn(),
  getFinancialEntries: vi.fn(),
  updateFinancialEntry: vi.fn(),
  getDashboardStats: vi.fn(),
}));

describe('FinancialService', () => {
  let service: FinancialService;

  beforeEach(() => {
    service = new FinancialService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== CONTAS A PAGAR ====================

  describe('listPayables', () => {
    it('deve listar contas a pagar com filtros', async () => {
      const mockPayables = [
        { id: 1, amount: 1000, status: 'pendente' },
        { id: 2, amount: 2000, status: 'pago' },
      ];
      vi.mocked(db.getProducerPayables).mockResolvedValue(mockPayables);

      const result = await service.listPayables({ status: 'pendente' });

      expect(result).toEqual(mockPayables);
      expect(db.getProducerPayables).toHaveBeenCalledWith({
        producerId: undefined,
        status: 'pendente',
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('deve filtrar por período', async () => {
      vi.mocked(db.getProducerPayables).mockResolvedValue([]);

      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      await service.listPayables({ startDate, endDate });

      expect(db.getProducerPayables).toHaveBeenCalledWith({
        producerId: undefined,
        status: undefined,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });
    });
  });

  describe('getPayableById', () => {
    it('deve retornar conta a pagar existente', async () => {
      const mockPayable = { id: 1, amount: 1000, status: 'pendente' };
      vi.mocked(db.getProducerPayableById).mockResolvedValue(mockPayable);

      const result = await service.getPayableById(1);

      expect(result).toEqual(mockPayable);
    });

    it('deve lançar NotFoundError se não encontrar', async () => {
      vi.mocked(db.getProducerPayableById).mockResolvedValue(null);

      await expect(service.getPayableById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createPayable', () => {
    it('deve criar conta a pagar com dados válidos', async () => {
      const mockProducer = { id: 1, name: 'Produtor Teste' };
      vi.mocked(db.getProducerById).mockResolvedValue(mockProducer);
      vi.mocked(db.createFinancialEntry).mockResolvedValue(1);

      const result = await service.createPayable({
        producerId: 1,
        amount: 1000,
        dueDate: '2026-02-15',
        description: 'Pagamento de carga',
      });

      expect(result).toEqual({ id: 1 });
      expect(db.createFinancialEntry).toHaveBeenCalled();
    });

    it('deve lançar ValidationError se produtor não existir', async () => {
      vi.mocked(db.getProducerById).mockResolvedValue(null);

      await expect(
        service.createPayable({
          producerId: 999,
          amount: 1000,
          dueDate: '2026-02-15',
          description: 'Teste',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('deve lançar ValidationError se valor for zero ou negativo', async () => {
      const mockProducer = { id: 1, name: 'Produtor Teste' };
      vi.mocked(db.getProducerById).mockResolvedValue(mockProducer);

      await expect(
        service.createPayable({
          producerId: 1,
          amount: 0,
          dueDate: '2026-02-15',
          description: 'Teste',
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        service.createPayable({
          producerId: 1,
          amount: -100,
          dueDate: '2026-02-15',
          description: 'Teste',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('markPayableAsPaid', () => {
    it('deve marcar conta como paga', async () => {
      const mockPayable = { id: 1, amount: 1000, status: 'pendente', paidAmount: 0 };
      vi.mocked(db.getProducerPayableById).mockResolvedValue(mockPayable);
      vi.mocked(db.updateProducerPayable).mockResolvedValue(undefined);

      await service.markPayableAsPaid({
        id: 1,
        paidAmount: 1000,
        paidAt: '2026-01-30',
        paymentMethod: 'pix',
      });

      expect(db.updateProducerPayable).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'pago',
        paidAt: '2026-01-30',
        paymentMethod: 'pix',
      }));
    });

    it('deve lançar BusinessError se já estiver paga', async () => {
      const mockPayable = { id: 1, amount: 1000, status: 'pago' };
      vi.mocked(db.getProducerPayableById).mockResolvedValue(mockPayable);

      await expect(
        service.markPayableAsPaid({
          id: 1,
          paidAmount: 1000,
          paidAt: '2026-01-30',
          paymentMethod: 'pix',
        })
      ).rejects.toThrow(BusinessError);
    });

    it('deve lançar ValidationError se valor exceder pendente', async () => {
      const mockPayable = { id: 1, amount: 1000, status: 'pendente', paidAmount: 500 };
      vi.mocked(db.getProducerPayableById).mockResolvedValue(mockPayable);

      await expect(
        service.markPayableAsPaid({
          id: 1,
          paidAmount: 600, // Excede os 500 pendentes
          paidAt: '2026-01-30',
          paymentMethod: 'pix',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('cancelPayable', () => {
    it('deve cancelar conta pendente', async () => {
      const mockPayable = { id: 1, amount: 1000, status: 'pendente' };
      vi.mocked(db.getProducerPayableById).mockResolvedValue(mockPayable);
      vi.mocked(db.updateProducerPayable).mockResolvedValue(undefined);

      await service.cancelPayable(1, 'Carga devolvida');

      expect(db.updateProducerPayable).toHaveBeenCalledWith(1, expect.objectContaining({
        observations: 'CANCELADO: Carga devolvida',
      }));
    });

    it('deve lançar BusinessError se já estiver paga', async () => {
      const mockPayable = { id: 1, amount: 1000, status: 'pago' };
      vi.mocked(db.getProducerPayableById).mockResolvedValue(mockPayable);

      await expect(
        service.cancelPayable(1, 'Motivo qualquer')
      ).rejects.toThrow(BusinessError);
    });
  });

  // ==================== CONTAS A RECEBER ====================

  describe('listReceivables', () => {
    it('deve listar contas a receber', async () => {
      const mockReceivables = [
        { id: 1, value: 5000, status: 'pendente', entryType: 'receber' },
      ];
      vi.mocked(db.getFinancialEntries).mockResolvedValue(mockReceivables);

      const result = await service.listReceivables({});

      expect(result).toEqual(mockReceivables);
      expect(db.getFinancialEntries).toHaveBeenCalledWith({
        entryType: 'receber',
        status: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });
  });

  describe('createReceivable', () => {
    it('deve criar conta a receber', async () => {
      vi.mocked(db.createFinancialEntry).mockResolvedValue(1);

      const result = await service.createReceivable({
        amount: 5000,
        dueDate: '2026-02-28',
        description: 'Venda de produtos',
      });

      expect(result).toEqual({ id: 1 });
    });

    it('deve lançar ValidationError se valor for inválido', async () => {
      await expect(
        service.createReceivable({
          amount: 0,
          dueDate: '2026-02-28',
          description: 'Teste',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('markReceivableAsReceived', () => {
    it('deve marcar como recebido', async () => {
      const mockReceivable = { id: 1, value: 5000, status: 'pendente' };
      vi.mocked(db.getFinancialEntries).mockResolvedValue([mockReceivable]);
      vi.mocked(db.updateFinancialEntry).mockResolvedValue(undefined);

      await service.markReceivableAsReceived({
        id: 1,
        paidAmount: 5000,
        paidAt: '2026-01-30',
        paymentMethod: 'transferencia',
      });

      expect(db.updateFinancialEntry).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'recebido',
      }));
    });

    it('deve lançar BusinessError se já recebido', async () => {
      const mockReceivable = { id: 1, value: 5000, status: 'recebido' };
      vi.mocked(db.getFinancialEntries).mockResolvedValue([mockReceivable]);

      await expect(
        service.markReceivableAsReceived({
          id: 1,
          paidAmount: 5000,
          paidAt: '2026-01-30',
          paymentMethod: 'transferencia',
        })
      ).rejects.toThrow(BusinessError);
    });
  });

  describe('cancelReceivable', () => {
    it('deve cancelar conta a receber pendente', async () => {
      const mockReceivable = { id: 1, value: 5000, status: 'pendente' };
      vi.mocked(db.getFinancialEntries).mockResolvedValue([mockReceivable]);
      vi.mocked(db.updateFinancialEntry).mockResolvedValue(undefined);

      await service.cancelReceivable(1, 'Cliente desistiu');

      expect(db.updateFinancialEntry).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'cancelado',
        observations: 'CANCELADO: Cliente desistiu',
      }));
    });

    it('deve lançar BusinessError se já recebido', async () => {
      const mockReceivable = { id: 1, value: 5000, status: 'recebido' };
      vi.mocked(db.getFinancialEntries).mockResolvedValue([mockReceivable]);

      await expect(
        service.cancelReceivable(1, 'Motivo')
      ).rejects.toThrow(BusinessError);
    });
  });

  // ==================== FLUXO DE CAIXA ====================

  describe('getCashFlowSummary', () => {
    it('deve retornar resumo do fluxo de caixa', async () => {
      vi.mocked(db.getDashboardStats).mockResolvedValue({
        payables: { total: 10000, overdue: 2000, pending: 5000 },
      });

      const result = await service.getCashFlowSummary();

      expect(result).toHaveProperty('totalPayables', 10000);
      expect(result).toHaveProperty('overduePayables', 2000);
      expect(result).toHaveProperty('payablesNext30Days', 5000);
    });
  });

  // ==================== RELATÓRIOS ====================

  describe('getOverduePayables', () => {
    it('deve retornar contas a pagar em atraso', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const mockPayables = [
        { id: 1, dueDate: yesterday.toISOString(), status: 'pendente' },
        { id: 2, dueDate: new Date(Date.now() + 86400000).toISOString(), status: 'pendente' },
      ];
      vi.mocked(db.getProducerPayables).mockResolvedValue(mockPayables);

      const result = await service.getOverduePayables();

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('getPayablesByProducer', () => {
    it('deve retornar contas de um produtor específico', async () => {
      const mockPayables = [
        { id: 1, producerId: 5, amount: 1000 },
        { id: 2, producerId: 5, amount: 2000 },
      ];
      vi.mocked(db.getProducerPayables).mockResolvedValue(mockPayables);

      const result = await service.getPayablesByProducer(5);

      expect(result).toEqual(mockPayables);
      expect(db.getProducerPayables).toHaveBeenCalledWith({ producerId: 5 });
    });
  });

  // ==================== VALIDAÇÕES ====================

  describe('validatePaymentAmount', () => {
    it('deve validar valor de pagamento correto', async () => {
      const mockPayable = { id: 1, amount: 1000, paidAmount: 0 };
      vi.mocked(db.getProducerPayableById).mockResolvedValue(mockPayable);

      const isValid = await service.validatePaymentAmount(1, 500);

      expect(isValid).toBe(true);
    });

    it('deve invalidar valor maior que pendente', async () => {
      const mockPayable = { id: 1, amount: 1000, paidAmount: 800 };
      vi.mocked(db.getProducerPayableById).mockResolvedValue(mockPayable);

      const isValid = await service.validatePaymentAmount(1, 300);

      expect(isValid).toBe(false);
    });

    it('deve invalidar valor zero ou negativo', async () => {
      const mockPayable = { id: 1, amount: 1000, paidAmount: 0 };
      vi.mocked(db.getProducerPayableById).mockResolvedValue(mockPayable);

      expect(await service.validatePaymentAmount(1, 0)).toBe(false);
      expect(await service.validatePaymentAmount(1, -100)).toBe(false);
    });
  });

  describe('calculatePendingAmount', () => {
    it('deve calcular valor pendente corretamente', async () => {
      const mockPayable = { id: 1, amount: 1000, paidAmount: 300 };
      vi.mocked(db.getProducerPayableById).mockResolvedValue(mockPayable);

      const pending = await service.calculatePendingAmount(1);

      expect(pending).toBe(700);
    });

    it('deve retornar valor total se nada foi pago', async () => {
      const mockPayable = { id: 1, amount: 1000, paidAmount: null };
      vi.mocked(db.getProducerPayableById).mockResolvedValue(mockPayable);

      const pending = await service.calculatePendingAmount(1);

      expect(pending).toBe(1000);
    });
  });
});
