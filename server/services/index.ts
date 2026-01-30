/**
 * Módulo de Services.
 * 
 * Exporta todas as implementações concretas dos services
 * e suas funções factory para obter instâncias singleton.
 * 
 * Services contêm a lógica de negócio e orquestram os repositories.
 */

// Interfaces
export * from './interfaces';

// Implementações e factories
export { ProducerService, getProducerService } from './producer.service';
export { LoadService, getLoadService } from './load.service';
export { FinancialService, getFinancialService } from './financial.service';
export { StockService, getStockService } from './stock.service';
export { QualityService, getQualityService } from './quality.service';

// TODO: Adicionar mais services conforme implementados
// export { ProductionService, getProductionService } from './production.service';
// export { BatchService, getBatchService } from './batch.service';
// export { PurchaseService, getPurchaseService } from './purchase.service';
// export { AuditService, getAuditService } from './audit.service';
