/**
 * Testes unitários para o QualityService.
 * Testa a lógica de negócio de qualidade com mocks dos repositories.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QualityService } from './quality.service';
import { NotFoundError, ValidationError, BusinessError } from '../errors';
import * as db from '../db';

// Mock do módulo db
vi.mock('../db', () => ({
  getQualityAnalyses: vi.fn(),
  createQualityAnalysis: vi.fn(),
  getNonConformities: vi.fn(),
  createNonConformity: vi.fn(),
  updateNonConformity: vi.fn(),
  createCorrectiveAction: vi.fn(),
  getProducers: vi.fn(),
  getCoconutLoads: vi.fn(),
  getOEEMetrics: vi.fn(),
}));

describe('QualityService', () => {
  let service: QualityService;

  beforeEach(() => {
    service = new QualityService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== ANÁLISES DE QUALIDADE ====================

  describe('listAnalyses', () => {
    it('deve listar análises de qualidade', async () => {
      const mockAnalyses = [
        { id: 1, analysisType: 'recebimento', result: 'aprovado' },
        { id: 2, analysisType: 'producao', result: 'reprovado' },
      ];
      vi.mocked(db.getQualityAnalyses).mockResolvedValue(mockAnalyses);

      const result = await service.listAnalyses({});

      expect(result).toEqual(mockAnalyses);
    });

    it('deve filtrar por tipo de análise', async () => {
      vi.mocked(db.getQualityAnalyses).mockResolvedValue([]);

      await service.listAnalyses({ analysisType: 'recebimento' });

      expect(db.getQualityAnalyses).toHaveBeenCalledWith(expect.objectContaining({
        analysisType: 'recebimento',
      }));
    });
  });

  describe('getAnalysisById', () => {
    it('deve retornar análise existente', async () => {
      const mockAnalyses = [
        { id: 1, analysisType: 'recebimento', result: 'aprovado' },
        { id: 2, analysisType: 'producao', result: 'reprovado' },
      ];
      vi.mocked(db.getQualityAnalyses).mockResolvedValue(mockAnalyses);

      const result = await service.getAnalysisById(1);

      expect(result.id).toBe(1);
    });

    it('deve lançar NotFoundError se não encontrar', async () => {
      vi.mocked(db.getQualityAnalyses).mockResolvedValue([]);

      await expect(service.getAnalysisById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createAnalysis', () => {
    it('deve criar análise com parâmetros conformes', async () => {
      vi.mocked(db.createQualityAnalysis).mockResolvedValue(1);

      const result = await service.createAnalysis({
        analysisType: 'recebimento',
        referenceType: 'carga',
        referenceId: 1,
        parameters: [
          { name: 'Brix', value: '12.5', result: 'conforme' },
          { name: 'Acidez', value: '0.3', result: 'conforme' },
        ],
      });

      expect(result).toEqual({ id: 1, result: 'conforme' });
    });

    it('deve criar análise e NC se houver parâmetro não conforme', async () => {
      vi.mocked(db.createQualityAnalysis).mockResolvedValue(1);
      vi.mocked(db.createNonConformity).mockResolvedValue(1);

      const result = await service.createAnalysis({
        analysisType: 'recebimento',
        referenceType: 'carga',
        referenceId: 1,
        parameters: [
          { name: 'Brix', value: '8.0', result: 'nao_conforme' },
          { name: 'Acidez', value: '0.3', result: 'conforme' },
        ],
      });

      expect(result.result).toBe('nao_conforme');
      expect(db.createNonConformity).toHaveBeenCalled();
    });

    it('deve lançar ValidationError se parâmetros forem inválidos', async () => {
      await expect(
        service.createAnalysis({
          analysisType: 'recebimento',
          referenceType: 'carga',
          referenceId: 1,
          parameters: [],
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== NÃO CONFORMIDADES (NCs) ====================

  describe('listNCs', () => {
    it('deve listar não conformidades', async () => {
      const mockNCs = [
        { id: 1, ncNumber: 'NC-001', status: 'aberta' },
        { id: 2, ncNumber: 'NC-002', status: 'fechada' },
      ];
      vi.mocked(db.getNonConformities).mockResolvedValue(mockNCs);

      const result = await service.listNCs({});

      expect(result).toEqual(mockNCs);
    });

    it('deve filtrar por status', async () => {
      vi.mocked(db.getNonConformities).mockResolvedValue([]);

      await service.listNCs({ status: 'aberta' });

      expect(db.getNonConformities).toHaveBeenCalledWith(expect.objectContaining({
        status: 'aberta',
      }));
    });
  });

  describe('getNCById', () => {
    it('deve retornar NC existente', async () => {
      const mockNCs = [
        { id: 1, ncNumber: 'NC-001', status: 'aberta' },
      ];
      vi.mocked(db.getNonConformities).mockResolvedValue(mockNCs);

      const result = await service.getNCById(1);

      expect(result.id).toBe(1);
    });

    it('deve lançar NotFoundError se não encontrar', async () => {
      vi.mocked(db.getNonConformities).mockResolvedValue([]);

      await expect(service.getNCById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createNC', () => {
    it('deve criar NC com dados válidos', async () => {
      vi.mocked(db.createNonConformity).mockResolvedValue(1);

      const result = await service.createNC({
        title: 'NC de Teste',
        description: 'Descrição da NC',
        severity: 'media',
        referenceType: 'carga',
        referenceId: 1,
      });

      expect(result.id).toBe(1);
      expect(result.ncNumber).toMatch(/^NC-\d+$/);
    });

    it('deve lançar ValidationError se título estiver vazio', async () => {
      await expect(
        service.createNC({
          title: '',
          description: 'Descrição',
          severity: 'media',
          referenceType: 'carga',
          referenceId: 1,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('deve lançar ValidationError se descrição estiver vazia', async () => {
      await expect(
        service.createNC({
          title: 'Título',
          description: '',
          severity: 'media',
          referenceType: 'carga',
          referenceId: 1,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('startNCAnalysis', () => {
    it('deve iniciar análise de NC aberta', async () => {
      const mockNCs = [{ id: 1, status: 'aberta' }];
      vi.mocked(db.getNonConformities).mockResolvedValue(mockNCs);
      vi.mocked(db.updateNonConformity).mockResolvedValue(undefined);

      await service.startNCAnalysis(1, '123');

      expect(db.updateNonConformity).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'em_analise',
      }));
    });

    it('deve lançar BusinessError se NC não estiver aberta', async () => {
      const mockNCs = [{ id: 1, status: 'fechada' }];
      vi.mocked(db.getNonConformities).mockResolvedValue(mockNCs);

      await expect(
        service.startNCAnalysis(1, '123')
      ).rejects.toThrow(BusinessError);
    });
  });

  describe('resolveNC', () => {
    it('deve resolver NC em análise', async () => {
      const mockNCs = [{ id: 1, status: 'em_analise' }];
      vi.mocked(db.getNonConformities).mockResolvedValue(mockNCs);
      vi.mocked(db.createCorrectiveAction).mockResolvedValue(1);
      vi.mocked(db.updateNonConformity).mockResolvedValue(undefined);

      await service.resolveNC(1, {
        rootCause: 'Falha no processo',
        correctiveAction: 'Ajustar parâmetros',
      });

      expect(db.createCorrectiveAction).toHaveBeenCalled();
      expect(db.updateNonConformity).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'verificacao',
      }));
    });

    it('deve lançar BusinessError se NC não estiver em análise', async () => {
      const mockNCs = [{ id: 1, status: 'aberta' }];
      vi.mocked(db.getNonConformities).mockResolvedValue(mockNCs);

      await expect(
        service.resolveNC(1, {
          rootCause: 'Causa',
          correctiveAction: 'Ação',
        })
      ).rejects.toThrow(BusinessError);
    });

    it('deve lançar ValidationError se causa raiz estiver vazia', async () => {
      const mockNCs = [{ id: 1, status: 'em_analise' }];
      vi.mocked(db.getNonConformities).mockResolvedValue(mockNCs);

      await expect(
        service.resolveNC(1, {
          rootCause: '',
          correctiveAction: 'Ação',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('deve lançar ValidationError se ação corretiva estiver vazia', async () => {
      const mockNCs = [{ id: 1, status: 'em_analise' }];
      vi.mocked(db.getNonConformities).mockResolvedValue(mockNCs);

      await expect(
        service.resolveNC(1, {
          rootCause: 'Causa',
          correctiveAction: '',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('closeNC', () => {
    it('deve fechar NC em verificação', async () => {
      const mockNCs = [{ id: 1, status: 'verificacao' }];
      vi.mocked(db.getNonConformities).mockResolvedValue(mockNCs);
      vi.mocked(db.updateNonConformity).mockResolvedValue(undefined);

      await service.closeNC(1, '123');

      expect(db.updateNonConformity).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'fechada',
      }));
    });

    it('deve lançar BusinessError se NC não estiver em verificação', async () => {
      const mockNCs = [{ id: 1, status: 'em_analise' }];
      vi.mocked(db.getNonConformities).mockResolvedValue(mockNCs);

      await expect(service.closeNC(1)).rejects.toThrow(BusinessError);
    });
  });

  // ==================== MÉTRICAS E RELATÓRIOS ====================

  describe('getQualityMetrics', () => {
    it('deve retornar métricas de qualidade', async () => {
      const mockAnalyses = [
        { id: 1, result: 'aprovado' },
        { id: 2, result: 'aprovado' },
        { id: 3, result: 'reprovado' },
      ];
      const mockNCs = [
        { id: 1, status: 'aberta' },
        { id: 2, status: 'fechada', createdAt: '2026-01-01', closedAt: '2026-01-05' },
      ];
      vi.mocked(db.getQualityAnalyses).mockResolvedValue(mockAnalyses);
      vi.mocked(db.getNonConformities).mockResolvedValue(mockNCs);

      const result = await service.getQualityMetrics();

      expect(result.totalAnalyses).toBe(3);
      expect(result.approvedAnalyses).toBe(2);
      expect(result.rejectedAnalyses).toBe(1);
      expect(result.approvalRate).toBeCloseTo(66.67, 1);
      expect(result.openNCs).toBe(1);
    });

    it('deve retornar zero se não houver análises', async () => {
      vi.mocked(db.getQualityAnalyses).mockResolvedValue([]);
      vi.mocked(db.getNonConformities).mockResolvedValue([]);

      const result = await service.getQualityMetrics();

      expect(result.totalAnalyses).toBe(0);
      expect(result.approvalRate).toBe(0);
    });
  });

  describe('getProducerQualityScores', () => {
    it('deve retornar scores de qualidade por produtor', async () => {
      const mockProducers = [
        { id: 1, name: 'Produtor A' },
        { id: 2, name: 'Produtor B' },
      ];
      const mockLoads = [
        { id: 1, producerId: 1, status: 'fechado', qualityGrade: 'A' },
        { id: 2, producerId: 1, status: 'fechado', qualityGrade: 'B' },
        { id: 3, producerId: 2, status: 'pendente', qualityGrade: null },
      ];
      vi.mocked(db.getProducers).mockResolvedValue(mockProducers);
      vi.mocked(db.getCoconutLoads).mockResolvedValue(mockLoads);

      const result = await service.getProducerQualityScores();

      expect(result.length).toBe(2);
      expect(result[0].producerName).toBe('Produtor A');
      expect(result[0].qualityScore).toBe(100);
    });
  });

  describe('getGradeDistribution', () => {
    it('deve retornar distribuição de graus', async () => {
      const mockLoads = [
        { id: 1, qualityGrade: 'A' },
        { id: 2, qualityGrade: 'A' },
        { id: 3, qualityGrade: 'B' },
        { id: 4, qualityGrade: 'C' },
        { id: 5, qualityGrade: null },
      ];
      vi.mocked(db.getCoconutLoads).mockResolvedValue(mockLoads);

      const result = await service.getGradeDistribution();

      expect(result.A).toBe(2);
      expect(result.B).toBe(1);
      expect(result.C).toBe(1);
      expect(result.D).toBe(0);
      expect(result.total).toBe(4);
    });
  });

  // ==================== VALIDAÇÕES ====================

  describe('validateAnalysisParameters', () => {
    it('deve validar parâmetros completos', () => {
      const result = service.validateAnalysisParameters([
        { name: 'Brix', value: '12.5', result: 'conforme' },
      ]);

      expect(result).toBe(true);
    });

    it('deve invalidar parâmetros vazios', () => {
      expect(service.validateAnalysisParameters([])).toBe(false);
    });

    it('deve invalidar parâmetros incompletos', () => {
      const result = service.validateAnalysisParameters([
        { name: 'Brix', value: '', result: 'conforme' },
      ]);

      expect(result).toBe(false);
    });

    it('deve validar limites numéricos', () => {
      const result = service.validateAnalysisParameters([
        { name: 'Brix', value: '15', result: 'nao_conforme', minValue: 10, maxValue: 14 },
      ]);

      expect(result).toBe(true);
    });

    it('deve invalidar se valor fora dos limites mas resultado conforme', () => {
      const result = service.validateAnalysisParameters([
        { name: 'Brix', value: '15', result: 'conforme', minValue: 10, maxValue: 14 },
      ]);

      expect(result).toBe(false);
    });
  });

  describe('checkNCCanBeResolved', () => {
    it('deve retornar true se NC estiver em análise', async () => {
      const mockNCs = [{ id: 1, status: 'em_analise' }];
      vi.mocked(db.getNonConformities).mockResolvedValue(mockNCs);

      const result = await service.checkNCCanBeResolved(1);

      expect(result).toBe(true);
    });

    it('deve retornar true se NC estiver em ação corretiva', async () => {
      const mockNCs = [{ id: 1, status: 'acao_corretiva' }];
      vi.mocked(db.getNonConformities).mockResolvedValue(mockNCs);

      const result = await service.checkNCCanBeResolved(1);

      expect(result).toBe(true);
    });

    it('deve retornar false se NC estiver fechada', async () => {
      const mockNCs = [{ id: 1, status: 'fechada' }];
      vi.mocked(db.getNonConformities).mockResolvedValue(mockNCs);

      const result = await service.checkNCCanBeResolved(1);

      expect(result).toBe(false);
    });
  });
});
