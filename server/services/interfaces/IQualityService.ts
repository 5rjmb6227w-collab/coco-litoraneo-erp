/**
 * Interface do Service de Qualidade.
 * Define o contrato para operações de controle de qualidade.
 */

// ==================== TIPOS ====================

export interface AnalysisFilters {
  analysisType?: 'microbiologica' | 'fisico_quimica' | 'sensorial' | 'outra';
  result?: 'aprovado' | 'reprovado' | 'pendente';
  startDate?: Date;
  endDate?: Date;
  referenceType?: string;
  referenceId?: number;
}

export interface CreateAnalysisDTO {
  analysisType: 'microbiologica' | 'fisico_quimica' | 'sensorial' | 'outra';
  referenceType: string;
  referenceId: number;
  parameters: AnalysisParameter[];
  observations?: string;
  analyzedBy?: string;
}

export interface AnalysisParameter {
  name: string;
  value: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  result: 'conforme' | 'nao_conforme';
}

export interface NCFilters {
  status?: 'aberta' | 'em_analise' | 'resolvida' | 'fechada';
  severity?: 'baixa' | 'media' | 'alta' | 'critica';
  startDate?: Date;
  endDate?: Date;
}

export interface CreateNCDTO {
  title: string;
  description: string;
  severity: 'baixa' | 'media' | 'alta' | 'critica';
  referenceType?: string;
  referenceId?: number;
  analysisId?: number;
  createdBy?: string;
}

export interface ResolveNCDTO {
  rootCause: string;
  correctiveAction: string;
  preventiveAction?: string;
  resolvedBy?: string;
}

export interface QualityMetrics {
  totalAnalyses: number;
  approvedAnalyses: number;
  rejectedAnalyses: number;
  approvalRate: number;
  openNCs: number;
  avgResolutionTime: number;
}

export interface ProducerQualityScore {
  producerId: number;
  producerName: string;
  totalLoads: number;
  approvedLoads: number;
  qualityScore: number;
  avgGrade: string;
}

// ==================== INTERFACE ====================

export interface IQualityService {
  // Análises de Qualidade
  listAnalyses(filters: AnalysisFilters): Promise<any[]>;
  getAnalysisById(id: number): Promise<any>;
  createAnalysis(data: CreateAnalysisDTO): Promise<any>;
  updateAnalysisResult(id: number, result: 'aprovado' | 'reprovado', updatedBy?: string): Promise<void>;
  
  // Não Conformidades (NCs)
  listNCs(filters: NCFilters): Promise<any[]>;
  getNCById(id: number): Promise<any>;
  createNC(data: CreateNCDTO): Promise<any>;
  startNCAnalysis(id: number, assignedTo: string): Promise<void>;
  resolveNC(id: number, data: ResolveNCDTO): Promise<void>;
  closeNC(id: number, closedBy?: string): Promise<void>;
  
  // Métricas e Relatórios
  getQualityMetrics(startDate?: Date, endDate?: Date): Promise<QualityMetrics>;
  getProducerQualityScores(): Promise<ProducerQualityScore[]>;
  getOEEByProduct(): Promise<any[]>;
  getGradeDistribution(): Promise<any>;
  
  // Validações
  validateAnalysisParameters(parameters: AnalysisParameter[]): boolean;
  checkNCCanBeResolved(id: number): Promise<boolean>;
}
