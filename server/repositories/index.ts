/**
 * Módulo de Repositories.
 * 
 * Exporta todas as implementações concretas dos repositories
 * e suas funções factory para obter instâncias singleton.
 */

// Interfaces
export * from './interfaces';

// Implementações e factories
export { ProducerRepository, getProducerRepository } from './producer.repository';
export { LoadRepository, getLoadRepository } from './load.repository';

// TODO: Adicionar mais repositories conforme implementados
// export { ProductionRepository, getProductionRepository } from './production.repository';
// export { StockRepository, getStockRepository } from './stock.repository';
// export { FinancialRepository, getFinancialRepository } from './financial.repository';
// export { BatchRepository, getBatchRepository } from './batch.repository';
// export { QualityRepository, getQualityRepository } from './quality.repository';
// export { PurchaseRepository, getPurchaseRepository } from './purchase.repository';
// export { AuditRepository, getAuditRepository } from './audit.repository';
