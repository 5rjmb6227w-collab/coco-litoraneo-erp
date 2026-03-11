/**
 * Módulo de interfaces dos Services.
 * 
 * Segue o princípio SOLID de Interface Segregation:
 * - Cada service tem sua própria interface
 * - Interfaces são específicas para cada domínio
 */

export type { IProducerService, ProducerSummary } from './IProducerService';
export type { ILoadService, LoadSummary } from './ILoadService';
export type { IFinancialService, CashFlowSummary } from './IFinancialService';
export type { IStockService, StockAlert, StockSummary } from './IStockService';
export type { IQualityService, QualityMetrics, ProducerQualityScore } from './IQualityService';
export type { IStrategicProjectService, StrategicProjectDashboard } from './IStrategicProjectService';
export type { IStrategicTaskService } from './IStrategicTaskService';

// Interfaces de Projetos Estratégicos implementadas acima
// TODO: Adicionar mais interfaces conforme implementadas
// export type { IProductionService } from './IProductionService';
// export type { IBatchService } from './IBatchService';
// export type { IPurchaseService } from './IPurchaseService';
// export type { IAuditService } from './IAuditService';
