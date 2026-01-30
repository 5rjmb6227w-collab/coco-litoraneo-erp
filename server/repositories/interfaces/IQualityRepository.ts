/**
 * Interface do Repository de Qualidade.
 * Segue o princípio SOLID de Dependency Inversion.
 */

import type { PaginationOptions, PaginatedResult } from './IProducerRepository';

export type NCStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type NCSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AnalysisResult = 'approved' | 'rejected' | 'conditional';

// ==================== ANÁLISES ====================

export interface AnalysisFilters {
  search?: string;
  batchId?: number;
  skuId?: number;
  result?: AnalysisResult | 'all';
  startDate?: Date;
  endDate?: Date;
  analyzedBy?: string;
}

export interface CreateAnalysisDTO {
  batchId?: number;
  skuId?: number;
  sampleCode?: string;
  ph?: number;
  brix?: number;
  acidity?: number;
  temperature?: number;
  turbidity?: number;
  color?: string;
  taste?: string;
  smell?: string;
  appearance?: string;
  result: AnalysisResult;
  notes?: string;
  analyzedBy?: string;
  analyzedAt?: Date;
  createdBy?: string;
}

export interface UpdateAnalysisDTO {
  ph?: number;
  brix?: number;
  acidity?: number;
  temperature?: number;
  turbidity?: number;
  color?: string;
  taste?: string;
  smell?: string;
  appearance?: string;
  result?: AnalysisResult;
  notes?: string;
  updatedBy?: string;
}

export interface Analysis {
  id: number;
  batchId: number | null;
  skuId: number | null;
  sampleCode: string | null;
  ph: number | null;
  brix: number | null;
  acidity: number | null;
  temperature: number | null;
  turbidity: number | null;
  color: string | null;
  taste: string | null;
  smell: string | null;
  appearance: string | null;
  result: AnalysisResult;
  notes: string | null;
  analyzedBy: string | null;
  analyzedAt: Date;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface AnalysisWithDetails extends Analysis {
  batch?: {
    id: number;
    code: string;
  } | null;
  sku?: {
    id: number;
    name: string;
    code: string;
  } | null;
}

// ==================== NÃO CONFORMIDADES ====================

export interface NCFilters {
  search?: string;
  status?: NCStatus | 'all';
  severity?: NCSeverity | 'all';
  category?: string;
  startDate?: Date;
  endDate?: Date;
  reportedBy?: string;
  assignedTo?: string;
}

export interface CreateNCDTO {
  title: string;
  description: string;
  category: string;
  severity: NCSeverity;
  batchId?: number;
  productionOrderId?: number;
  analysisId?: number;
  rootCause?: string;
  immediateAction?: string;
  reportedBy?: string;
  assignedTo?: string;
  dueDate?: Date;
  attachments?: string[];
  createdBy?: string;
}

export interface UpdateNCDTO {
  title?: string;
  description?: string;
  category?: string;
  severity?: NCSeverity;
  status?: NCStatus;
  rootCause?: string;
  immediateAction?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  assignedTo?: string;
  dueDate?: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  closedAt?: Date;
  closedBy?: string;
  attachments?: string[];
  updatedBy?: string;
}

export interface NonConformity {
  id: number;
  ncNumber: string;
  title: string;
  description: string;
  category: string;
  severity: NCSeverity;
  status: NCStatus;
  batchId: number | null;
  productionOrderId: number | null;
  analysisId: number | null;
  rootCause: string | null;
  immediateAction: string | null;
  correctiveAction: string | null;
  preventiveAction: string | null;
  reportedBy: string | null;
  assignedTo: string | null;
  dueDate: Date | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  closedAt: Date | null;
  closedBy: string | null;
  attachments: string[] | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface NCWithDetails extends NonConformity {
  batch?: {
    id: number;
    code: string;
  } | null;
  productionOrder?: {
    id: number;
    opNumber: string;
  } | null;
  analysis?: {
    id: number;
    sampleCode: string | null;
    result: AnalysisResult;
  } | null;
}

// ==================== MÉTRICAS ====================

export interface QualitySummary {
  totalAnalyses: number;
  approvedRate: number;
  rejectedRate: number;
  openNCs: number;
  resolvedNCs: number;
  avgResolutionDays: number;
}

export interface NCsByCategory {
  category: string;
  count: number;
  percentage: number;
}

export interface NCsBySeverity {
  severity: NCSeverity;
  count: number;
  percentage: number;
}

export interface IQualityRepository {
  // ==================== ANÁLISES ====================

  findAllAnalyses(
    filters: AnalysisFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<AnalysisWithDetails>>;

  findAnalysisById(id: number): Promise<AnalysisWithDetails | null>;

  findAnalysesByBatch(batchId: number): Promise<Analysis[]>;

  createAnalysis(data: CreateAnalysisDTO): Promise<Analysis>;

  updateAnalysis(id: number, data: UpdateAnalysisDTO): Promise<Analysis>;

  deleteAnalysis(id: number): Promise<void>;

  getAnalysisStats(startDate: Date, endDate: Date): Promise<{
    total: number;
    approved: number;
    rejected: number;
    conditional: number;
  }>;

  // ==================== NÃO CONFORMIDADES ====================

  findAllNCs(
    filters: NCFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<NCWithDetails>>;

  findNCById(id: number): Promise<NCWithDetails | null>;

  findNCByNumber(ncNumber: string): Promise<NCWithDetails | null>;

  createNC(data: CreateNCDTO): Promise<NonConformity>;

  updateNC(id: number, data: UpdateNCDTO): Promise<NonConformity>;

  deleteNC(id: number): Promise<void>;

  resolveNC(id: number, correctiveAction: string, preventiveAction: string, resolvedBy: string): Promise<NonConformity>;

  closeNC(id: number, closedBy: string): Promise<NonConformity>;

  assignNC(id: number, assignedTo: string): Promise<NonConformity>;

  getOpenNCs(): Promise<NCWithDetails[]>;

  getOverdueNCs(): Promise<NCWithDetails[]>;

  // ==================== MÉTRICAS ====================

  getQualitySummary(startDate?: Date, endDate?: Date): Promise<QualitySummary>;

  getNCsByCategory(): Promise<NCsByCategory[]>;

  getNCsBySeverity(): Promise<NCsBySeverity[]>;

  countOpenNCs(): Promise<number>;

  countOverdueNCs(): Promise<number>;

  getConformityIndex(startDate: Date, endDate: Date): Promise<number>;

  // ==================== GERAÇÃO DE NÚMERO ====================

  generateNCNumber(): Promise<string>;
}

export default IQualityRepository;
