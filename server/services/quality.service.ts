/**
 * Implementação do Service de Qualidade.
 * Segue o princípio SOLID de Single Responsibility - apenas lógica de negócio de qualidade.
 */

import type {
  IQualityService,
  AnalysisFilters,
  CreateAnalysisDTO,
  AnalysisParameter,
  NCFilters,
  CreateNCDTO,
  ResolveNCDTO,
  QualityMetrics,
  ProducerQualityScore
} from './interfaces/IQualityService';
import { NotFoundError, ValidationError, BusinessError } from '../errors';
import * as db from '../db';

export class QualityService implements IQualityService {
  
  // ==================== ANÁLISES DE QUALIDADE ====================
  
  async listAnalyses(filters: AnalysisFilters): Promise<any[]> {
    return db.getQualityAnalyses({
      analysisType: filters.analysisType,
      result: filters.result,
      startDate: filters.startDate?.toISOString().split('T')[0],
      endDate: filters.endDate?.toISOString().split('T')[0]
    });
  }
  
  async getAnalysisById(id: number): Promise<any> {
    const analyses = await db.getQualityAnalyses({});
    const analysis = analyses.find((a: any) => a.id === id);
    if (!analysis) {
      throw new NotFoundError('Análise de Qualidade', id);
    }
    return analysis;
  }
  
  async createAnalysis(data: CreateAnalysisDTO): Promise<any> {
    // Validar parâmetros
    if (!this.validateAnalysisParameters(data.parameters)) {
      throw new ValidationError('Parâmetros de análise inválidos');
    }
    
    // Determinar resultado geral
    const hasNonConforming = data.parameters.some(p => p.result === 'nao_conforme');
    const result = hasNonConforming ? 'nao_conforme' : 'conforme';
    
    const id = await db.createQualityAnalysis({
      analysisType: data.analysisType,
      analysisDate: new Date(),
      relatedTo: data.referenceType === 'carga' ? 'carga_coco' : 'lote_producao',
      referenceId: data.referenceId,
      result: result,
      parameters: JSON.stringify(data.parameters),
      results: JSON.stringify(data.parameters.map(p => ({ name: p.name, value: p.value, result: p.result }))),
      observations: data.observations,
      createdBy: data.analyzedBy ? Number(data.analyzedBy) : undefined,
    });
    
    // Se não conforme, criar NC automaticamente
    if (result === 'nao_conforme') {
      await this.createNC({
        title: `NC - Análise ${data.analysisType} reprovada`,
        description: `Análise de ${data.analysisType} com parâmetros não conformes`,
        severity: 'media',
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        analysisId: id,
        createdBy: data.analyzedBy,
      });
    }
    
    return { id, result };
  }
  
  async updateAnalysisResult(id: number, result: 'aprovado' | 'reprovado', updatedBy?: string): Promise<void> {
    await this.getAnalysisById(id); // Valida existência
    
    // TODO: Implementar função updateQualityAnalysis no db.ts
    // Por enquanto, apenas registra a intenção
    console.log(`Atualizando análise ${id} para ${result}`);
  }
  
  // ==================== NÃO CONFORMIDADES (NCs) ====================
  
  async listNCs(filters: NCFilters): Promise<any[]> {
    return db.getNonConformities({
      status: filters.status,
      startDate: filters.startDate?.toISOString().split('T')[0],
      endDate: filters.endDate?.toISOString().split('T')[0]
    });
  }
  
  async getNCById(id: number): Promise<any> {
    const ncs = await db.getNonConformities({});
    const nc = ncs.find((n: any) => n.id === id);
    if (!nc) {
      throw new NotFoundError('Não Conformidade', id);
    }
    return nc;
  }
  
  async createNC(data: CreateNCDTO): Promise<any> {
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Título da NC é obrigatório');
    }
    
    if (!data.description || data.description.trim().length === 0) {
      throw new ValidationError('Descrição da NC é obrigatória');
    }
    
    // Gerar número da NC
    const ncNumber = `NC-${Date.now()}`;
    
    const id = await db.createNonConformity({
      ncNumber: ncNumber,
      description: data.description,
      origin: 'processo', // Default
      area: 'qualidade', // Default
      identificationDate: new Date(),
      status: 'aberta',
      relatedAnalysisId: data.analysisId,
      createdBy: data.createdBy ? Number(data.createdBy) : undefined,
    });
    
    return { id, ncNumber };
  }
  
  async startNCAnalysis(id: number, assignedTo: string): Promise<void> {
    const nc = await this.getNCById(id);
    
    if (nc.status !== 'aberta') {
      throw BusinessError.invalidStatusTransition('NC', nc.status, 'em_analise');
    }
    
    await db.updateNonConformity(id, {
      status: 'em_analise',
      updatedBy: Number(assignedTo),
    });
  }
  
  async resolveNC(id: number, data: ResolveNCDTO): Promise<void> {
    const nc = await this.getNCById(id);
    
    if (nc.status !== 'em_analise' && nc.status !== 'acao_corretiva') {
      throw BusinessError.invalidStatusTransition('NC', nc.status, 'verificacao');
    }
    
    if (!data.rootCause || data.rootCause.trim().length === 0) {
      throw new ValidationError('Causa raiz é obrigatória');
    }
    
    if (!data.correctiveAction || data.correctiveAction.trim().length === 0) {
      throw new ValidationError('Ação corretiva é obrigatória');
    }
    
    // Criar ação corretiva
    await db.createCorrectiveAction({
      nonConformityId: id,
      rootCause: data.rootCause,
      correctiveAction: data.correctiveAction,
      responsibleId: data.resolvedBy ? Number(data.resolvedBy) : undefined,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      status: 'concluida',
    });
    
    await db.updateNonConformity(id, {
      status: 'verificacao',
      updatedBy: data.resolvedBy ? Number(data.resolvedBy) : undefined,
    });
  }
  
  async closeNC(id: number, closedBy?: string): Promise<void> {
    const nc = await this.getNCById(id);
    
    if (nc.status !== 'verificacao') {
      throw BusinessError.invalidStatusTransition('NC', nc.status, 'fechada');
    }
    
    await db.updateNonConformity(id, {
      status: 'fechada',
      closedAt: new Date(),
      closedBy: closedBy ? Number(closedBy) : undefined,
    });
  }
  
  // ==================== MÉTRICAS E RELATÓRIOS ====================
  
  async getQualityMetrics(startDate?: Date, endDate?: Date): Promise<QualityMetrics> {
    const analyses = await this.listAnalyses({
      startDate,
      endDate
    });
    
    const ncs = await this.listNCs({
      startDate,
      endDate
    });
    
    const totalAnalyses = analyses.length;
    const approvedAnalyses = analyses.filter((a: any) => a.result === 'aprovado').length;
    const rejectedAnalyses = analyses.filter((a: any) => a.result === 'reprovado').length;
    const approvalRate = totalAnalyses > 0 ? (approvedAnalyses / totalAnalyses) * 100 : 0;
    const openNCs = ncs.filter((nc: any) => nc.status === 'aberta' || nc.status === 'em_analise').length;
    
    // Calcular tempo médio de resolução
    const closedNCs = ncs.filter((nc: any) => nc.closedAt);
    let avgResolutionTime = 0;
    if (closedNCs.length > 0) {
      const totalTime = closedNCs.reduce((sum: number, nc: any) => {
        const created = new Date(nc.createdAt).getTime();
        const closed = new Date(nc.closedAt).getTime();
        return sum + (closed - created);
      }, 0);
      avgResolutionTime = totalTime / closedNCs.length / (1000 * 60 * 60 * 24); // Em dias
    }
    
    return {
      totalAnalyses,
      approvedAnalyses,
      rejectedAnalyses,
      approvalRate: Math.round(approvalRate * 100) / 100,
      openNCs,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10
    };
  }
  
  async getProducerQualityScores(): Promise<ProducerQualityScore[]> {
    const producers = await db.getProducers();
    const loads = await db.getCoconutLoads({});
    
    return producers.map((producer: any) => {
      const producerLoads = loads.filter((l: any) => l.producerId === producer.id);
      const approvedLoads = producerLoads.filter((l: any) => l.status === 'fechado').length;
      const totalLoads = producerLoads.length;
      const qualityScore = totalLoads > 0 ? (approvedLoads / totalLoads) * 100 : 0;
      
      // Calcular grau médio
      const grades = producerLoads
        .filter((l: any) => l.qualityGrade)
        .map((l: any) => l.qualityGrade);
      const avgGrade = grades.length > 0 ? this.calculateAverageGrade(grades) : 'N/A';
      
      return {
        producerId: producer.id,
        producerName: producer.name,
        totalLoads,
        approvedLoads,
        qualityScore: Math.round(qualityScore * 100) / 100,
        avgGrade
      };
    }).sort((a: ProducerQualityScore, b: ProducerQualityScore) => b.qualityScore - a.qualityScore);
  }
  
  async getOEEByProduct(): Promise<any[]> {
    // Usar função existente de OEE
    const oee = await db.getOEEMetrics();
    return oee ? [oee] : [];
  }
  
  async getGradeDistribution(): Promise<any> {
    const loads = await db.getCoconutLoads({});
    
    const distribution = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      total: 0
    };
    
    loads.forEach((load: any) => {
      if (load.qualityGrade) {
        distribution[load.qualityGrade as keyof typeof distribution]++;
        distribution.total++;
      }
    });
    
    return distribution;
  }
  
  // ==================== VALIDAÇÕES ====================
  
  validateAnalysisParameters(parameters: AnalysisParameter[]): boolean {
    if (!parameters || parameters.length === 0) {
      return false;
    }
    
    return parameters.every(p => {
      if (!p.name || !p.value || !p.result) {
        return false;
      }
      
      // Validar limites se especificados
      if (p.minValue !== undefined && p.maxValue !== undefined) {
        const numValue = parseFloat(p.value);
        if (isNaN(numValue)) return false;
        if (numValue < p.minValue || numValue > p.maxValue) {
          return p.result === 'nao_conforme';
        }
      }
      
      return true;
    });
  }
  
  async checkNCCanBeResolved(id: number): Promise<boolean> {
    const nc = await this.getNCById(id);
    return nc.status === 'em_analise' || nc.status === 'acao_corretiva';
  }
  
  // ==================== HELPERS PRIVADOS ====================
  
  private calculateAverageGrade(grades: string[]): string {
    const gradeValues: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };
    const sum = grades.reduce((acc, g) => acc + (gradeValues[g] || 0), 0);
    const avg = sum / grades.length;
    
    if (avg >= 3.5) return 'A';
    if (avg >= 2.5) return 'B';
    if (avg >= 1.5) return 'C';
    return 'D';
  }
}

// Singleton para uso global
let qualityServiceInstance: QualityService | null = null;

export function getQualityService(): QualityService {
  if (!qualityServiceInstance) {
    qualityServiceInstance = new QualityService();
  }
  return qualityServiceInstance;
}
