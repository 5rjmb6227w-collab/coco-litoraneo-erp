/**
 * Módulo de interfaces dos Repositories.
 * 
 * Segue o princípio SOLID de Dependency Inversion:
 * - Services dependem destas interfaces, não das implementações concretas
 * - Facilita testes unitários com mocks
 * - Permite trocar implementações sem afetar o código cliente
 */

// Tipos comuns
export type { PaginationOptions, PaginatedResult } from './IProducerRepository';

// Interfaces de Repositories
export type { 
  IProducerRepository,
  ProducerFilters,
  CreateProducerDTO,
  UpdateProducerDTO,
  Producer
} from './IProducerRepository';

export type {
  ILoadRepository,
  LoadFilters,
  CreateLoadDTO,
  UpdateLoadDTO,
  Load,
  LoadWithProducer,
  LoadEvolution,
  LoadStatus
} from './ILoadRepository';

export type {
  IProductionRepository,
  ProductionOrderFilters,
  CreateProductionOrderDTO,
  UpdateProductionOrderDTO,
  ProductionOrder,
  ProductionLogFilters,
  CreateProductionLogDTO,
  ProductionLog,
  ProductionProblemFilters,
  CreateProductionProblemDTO,
  UpdateProductionProblemDTO,
  ProductionProblem,
  ProductionByShift,
  ProductionBySku,
  OEEMetrics,
  ProductionOrderStatus,
  Priority,
  Shift
} from './IProductionRepository';

export type {
  IStockRepository,
  WarehouseItemFilters,
  CreateWarehouseItemDTO,
  UpdateWarehouseItemDTO,
  WarehouseItem,
  MovementFilters,
  CreateMovementDTO,
  Movement,
  MovementWithItem,
  FinishedGoodsFilters,
  CreateFinishedGoodsDTO,
  UpdateFinishedGoodsDTO,
  FinishedGoods,
  FinishedGoodsWithSku,
  StockAlert,
  MovementType,
  WarehouseCategory
} from './IStockRepository';

export type {
  IFinancialRepository,
  ProducerPayableFilters,
  CreateProducerPayableDTO,
  UpdateProducerPayableDTO,
  ProducerPayable,
  ProducerPayableWithDetails,
  AccountReceivableFilters,
  CreateAccountReceivableDTO,
  UpdateAccountReceivableDTO,
  AccountReceivable,
  CashFlowEntry,
  CashFlowSummary,
  PaymentsByStatus,
  FinancialSummary,
  PaymentStatus,
  ReceivableStatus
} from './IFinancialRepository';

export type {
  IBatchRepository,
  BatchFilters,
  CreateBatchDTO,
  UpdateBatchDTO,
  Batch,
  BatchWithDetails,
  TraceabilityNode,
  TraceabilityChain,
  BatchSummary,
  BatchStatus
} from './IBatchRepository';

export type {
  IQualityRepository,
  AnalysisFilters,
  CreateAnalysisDTO,
  UpdateAnalysisDTO,
  Analysis,
  AnalysisWithDetails,
  NCFilters,
  CreateNCDTO,
  UpdateNCDTO,
  NonConformity,
  NCWithDetails,
  QualitySummary,
  NCsByCategory,
  NCsBySeverity,
  NCStatus,
  NCSeverity,
  AnalysisResult
} from './IQualityRepository';

export type {
  IPurchaseRepository,
  PurchaseRequestFilters,
  CreatePurchaseRequestDTO,
  UpdatePurchaseRequestDTO,
  PurchaseRequest,
  PurchaseRequestWithItem,
  QuotationFilters,
  CreateQuotationDTO,
  UpdateQuotationDTO,
  Quotation,
  QuotationWithDetails,
  SupplierFilters,
  CreateSupplierDTO,
  UpdateSupplierDTO,
  Supplier,
  PriceHistory,
  PriceHistoryWithDetails,
  PurchaseRequestStatus,
  QuotationStatus
} from './IPurchaseRepository';

export type {
  IAuditRepository,
  AuditLogFilters,
  CreateAuditLogDTO,
  AuditLog,
  SessionFilters,
  CreateSessionDTO,
  Session,
  SecurityAlertFilters,
  CreateSecurityAlertDTO,
  UpdateSecurityAlertDTO,
  SecurityAlert,
  AuditSummary,
  SecuritySummary,
  AuditAction
} from './IAuditRepository';
