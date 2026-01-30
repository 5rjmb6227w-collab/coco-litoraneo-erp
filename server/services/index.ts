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

// TODO: Adicionar mais services conforme implementados
// export { ProductionService, getProductionService } from './production.service';
// export { StockService, getStockService } from './stock.service';
// export { FinancialService, getFinancialService } from './financial.service';
// export { BatchService, getBatchService } from './batch.service';
// export { QualityService, getQualityService } from './quality.service';
// export { PurchaseService, getPurchaseService } from './purchase.service';
// export { AuditService, getAuditService } from './audit.service';
