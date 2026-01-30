/**
 * Módulo de interfaces dos Services.
 * 
 * Segue o princípio SOLID de Interface Segregation:
 * - Cada service tem sua própria interface
 * - Interfaces são específicas para cada domínio
 */

export type { IProducerService, ProducerSummary } from './IProducerService';
export type { ILoadService, LoadSummary } from './ILoadService';

// TODO: Adicionar mais interfaces conforme implementadas
// export type { IProductionService } from './IProductionService';
// export type { IStockService } from './IStockService';
// export type { IFinancialService } from './IFinancialService';
// export type { IBatchService } from './IBatchService';
// export type { IQualityService } from './IQualityService';
// export type { IPurchaseService } from './IPurchaseService';
// export type { IAuditService } from './IAuditService';
