import { 
  int, 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp, 
  varchar, 
  decimal, 
  date,
  boolean,
  json
} from "drizzle-orm/mysql-core";

// ============================================================================
// USERS TABLE (Sistema de autenticação)
// ============================================================================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "ceo", "recebimento", "producao", "almox_prod", "almox_geral", "qualidade", "compras", "financeiro", "rh", "consulta"]).default("user").notNull(),
  sector: varchar("sector", { length: 100 }),
  status: mysqlEnum("status", ["ativo", "inativo", "bloqueado"]).default("ativo").notNull(),
  forcePasswordChange: boolean("forcePasswordChange").default(true),
  accessStartDate: date("accessStartDate"),
  accessExpirationDate: date("accessExpirationDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// PRODUCERS TABLE (Produtores/Fornecedores de coco)
// ============================================================================
export const producers = mysqlTable("producers", {
  id: int("id").autoincrement().primaryKey(),
  externalCode: varchar("externalCode", { length: 50 }),
  name: varchar("name", { length: 255 }).notNull(),
  cpfCnpj: varchar("cpfCnpj", { length: 20 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  bank: varchar("bank", { length: 100 }),
  agency: varchar("agency", { length: 20 }),
  account: varchar("account", { length: 30 }),
  accountType: mysqlEnum("accountType", ["corrente", "poupanca"]),
  pixKey: varchar("pixKey", { length: 255 }),
  defaultPricePerKg: decimal("defaultPricePerKg", { precision: 10, scale: 2 }).notNull(),
  defaultDiscountPercent: decimal("defaultDiscountPercent", { precision: 5, scale: 2 }).default("0"),
  status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type Producer = typeof producers.$inferSelect;
export type InsertProducer = typeof producers.$inferInsert;

// ============================================================================
// COCONUT_LOADS TABLE (Recebimento de coco)
// ============================================================================
export const coconutLoads = mysqlTable("coconut_loads", {
  id: int("id").autoincrement().primaryKey(),
  externalCode: varchar("externalCode", { length: 50 }),
  receivedAt: timestamp("receivedAt").notNull(),
  producerId: int("producerId").notNull(),
  licensePlate: varchar("licensePlate", { length: 10 }).notNull(),
  driverName: varchar("driverName", { length: 255 }),
  grossWeight: decimal("grossWeight", { precision: 10, scale: 2 }).notNull(),
  tareWeight: decimal("tareWeight", { precision: 10, scale: 2 }).notNull(),
  netWeight: decimal("netWeight", { precision: 10, scale: 2 }).notNull(),
  observations: text("observations"),
  photoUrl: varchar("photoUrl", { length: 500 }),
  status: mysqlEnum("status", ["recebido", "conferido", "fechado"]).default("recebido").notNull(),
  closedAt: timestamp("closedAt"),
  closedBy: int("closedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type CoconutLoad = typeof coconutLoads.$inferSelect;
export type InsertCoconutLoad = typeof coconutLoads.$inferInsert;

// ============================================================================
// PRODUCER_PAYABLES TABLE (Pagamentos a produtores)
// ============================================================================
export const producerPayables = mysqlTable("producer_payables", {
  id: int("id").autoincrement().primaryKey(),
  externalCode: varchar("externalCode", { length: 50 }),
  coconutLoadId: int("coconutLoadId").notNull(),
  producerId: int("producerId").notNull(),
  netWeight: decimal("netWeight", { precision: 10, scale: 2 }).notNull(),
  pricePerKg: decimal("pricePerKg", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discountPercent", { precision: 5, scale: 2 }).default("0"),
  discountKg: decimal("discountKg", { precision: 10, scale: 2 }).default("0"),
  payableWeight: decimal("payableWeight", { precision: 10, scale: 2 }).notNull(),
  totalValue: decimal("totalValue", { precision: 14, scale: 2 }).notNull(),
  dueDate: date("dueDate"),
  status: mysqlEnum("status", ["pendente", "aprovado", "programado", "pago"]).default("pendente").notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"),
  scheduledAt: timestamp("scheduledAt"),
  scheduledBy: int("scheduledBy"),
  paidAt: timestamp("paidAt"),
  paidBy: int("paidBy"),
  paymentMethod: mysqlEnum("paymentMethod", ["pix", "transferencia", "boleto", "dinheiro", "cheque"]),
  receiptUrl: varchar("receiptUrl", { length: 500 }),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type ProducerPayable = typeof producerPayables.$inferSelect;
export type InsertProducerPayable = typeof producerPayables.$inferInsert;

// ============================================================================
// WAREHOUSE_ITEMS TABLE (Itens de almoxarifado - Produção e Gerais)
// ============================================================================
export const warehouseItems = mysqlTable("warehouse_items", {
  id: int("id").autoincrement().primaryKey(),
  externalCode: varchar("externalCode", { length: 50 }),
  internalCode: varchar("internalCode", { length: 20 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  unit: mysqlEnum("unit", ["kg", "litro", "unidade", "metro", "rolo"]).notNull(),
  warehouseType: mysqlEnum("warehouseType", ["producao", "geral"]).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  minimumStock: decimal("minimumStock", { precision: 10, scale: 2 }).notNull(),
  currentStock: decimal("currentStock", { precision: 10, scale: 2 }).default("0").notNull(),
  defaultSupplier: varchar("defaultSupplier", { length: 255 }),
  location: varchar("location", { length: 100 }),
  status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type WarehouseItem = typeof warehouseItems.$inferSelect;
export type InsertWarehouseItem = typeof warehouseItems.$inferInsert;

// ============================================================================
// WAREHOUSE_MOVEMENTS TABLE (Movimentações de almoxarifado)
// ============================================================================
export const warehouseMovements = mysqlTable("warehouse_movements", {
  id: int("id").autoincrement().primaryKey(),
  warehouseItemId: int("warehouseItemId").notNull(),
  movementType: mysqlEnum("movementType", ["entrada", "saida", "ajuste"]).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  reason: varchar("reason", { length: 100 }).notNull(),
  observations: text("observations"),
  previousStock: decimal("previousStock", { precision: 10, scale: 2 }).notNull(),
  newStock: decimal("newStock", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type WarehouseMovement = typeof warehouseMovements.$inferSelect;
export type InsertWarehouseMovement = typeof warehouseMovements.$inferInsert;

// ============================================================================
// SKUS TABLE (SKUs de produto acabado)
// ============================================================================
export const skus = mysqlTable("skus", {
  id: int("id").autoincrement().primaryKey(),
  externalCode: varchar("externalCode", { length: 50 }),
  code: varchar("code", { length: 20 }).notNull().unique(),
  description: varchar("description", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["seco", "umido", "adocado"]).notNull(),
  variation: mysqlEnum("variation", ["flocos", "medio", "fino"]).notNull(),
  packageWeight: decimal("packageWeight", { precision: 10, scale: 2 }).notNull(),
  packageType: varchar("packageType", { length: 100 }),
  minimumStock: decimal("minimumStock", { precision: 10, scale: 2 }).notNull(),
  currentStock: decimal("currentStock", { precision: 10, scale: 2 }).default("0").notNull(),
  shelfLifeDays: int("shelfLifeDays").notNull(),
  suggestedPrice: decimal("suggestedPrice", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type Sku = typeof skus.$inferSelect;
export type InsertSku = typeof skus.$inferInsert;

// ============================================================================
// FINISHED_GOODS_INVENTORY TABLE (Estoque de produto acabado por lote)
// ============================================================================
export const finishedGoodsInventory = mysqlTable("finished_goods_inventory", {
  id: int("id").autoincrement().primaryKey(),
  skuId: int("skuId").notNull(),
  batchNumber: varchar("batchNumber", { length: 50 }).notNull(),
  productionDate: date("productionDate").notNull(),
  expirationDate: date("expirationDate").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["disponivel", "reservado", "vencido"]).default("disponivel").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type FinishedGoodsInventory = typeof finishedGoodsInventory.$inferSelect;
export type InsertFinishedGoodsInventory = typeof finishedGoodsInventory.$inferInsert;

// ============================================================================
// FINISHED_GOODS_MOVEMENTS TABLE (Movimentações de produto acabado)
// ============================================================================
export const finishedGoodsMovements = mysqlTable("finished_goods_movements", {
  id: int("id").autoincrement().primaryKey(),
  skuId: int("skuId").notNull(),
  inventoryId: int("inventoryId"),
  movementType: mysqlEnum("movementType", ["entrada", "saida", "ajuste"]).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  batchNumber: varchar("batchNumber", { length: 50 }),
  reason: varchar("reason", { length: 100 }).notNull(),
  referenceType: varchar("referenceType", { length: 50 }),
  referenceId: int("referenceId"),
  customerDestination: varchar("customerDestination", { length: 255 }),
  observations: text("observations"),
  previousStock: decimal("previousStock", { precision: 10, scale: 2 }).notNull(),
  newStock: decimal("newStock", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type FinishedGoodsMovement = typeof finishedGoodsMovements.$inferSelect;
export type InsertFinishedGoodsMovement = typeof finishedGoodsMovements.$inferInsert;

// ============================================================================
// AUDIT_LOGS TABLE (Logs de auditoria)
// ============================================================================
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  userName: varchar("userName", { length: 255 }),
  action: varchar("action", { length: 50 }).notNull(),
  module: varchar("module", { length: 50 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId"),
  fieldName: varchar("fieldName", { length: 100 }),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  details: json("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ============================================================================
// ATTACHMENTS TABLE (Anexos polimórficos)
// ============================================================================
export const attachments = mysqlTable("attachments", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(),
  fileSize: int("fileSize"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = typeof attachments.$inferInsert;


// ============================================================================
// TAREFA 2: MÓDULOS DE GESTÃO
// ============================================================================

// ============================================================================
// PRODUCTION_ENTRIES TABLE (Apontamentos de produção)
// ============================================================================
export const productionEntries = mysqlTable("production_entries", {
  id: int("id").autoincrement().primaryKey(),
  externalCode: varchar("externalCode", { length: 50 }),
  productionDate: date("productionDate").notNull(),
  shift: mysqlEnum("shift", ["manha", "tarde", "noite"]).notNull(),
  line: mysqlEnum("line", ["linha1", "linha2", "unica"]).default("unica"),
  responsibleId: int("responsibleId"),
  responsibleName: varchar("responsibleName", { length: 255 }),
  skuId: int("skuId").notNull(),
  variation: mysqlEnum("variation", ["flocos", "medio", "fino"]).notNull(),
  quantityProduced: decimal("quantityProduced", { precision: 10, scale: 2 }).notNull(),
  batchNumber: varchar("batchNumber", { length: 50 }).notNull(),
  losses: decimal("losses", { precision: 10, scale: 2 }).default("0"),
  lossReason: mysqlEnum("lossReason", ["processo", "qualidade", "equipamento", "materia_prima", "outro"]),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type ProductionEntry = typeof productionEntries.$inferSelect;
export type InsertProductionEntry = typeof productionEntries.$inferInsert;

// ============================================================================
// PRODUCTION_ISSUES TABLE (Problemas do dia)
// ============================================================================
export const productionIssues = mysqlTable("production_issues", {
  id: int("id").autoincrement().primaryKey(),
  occurredAt: timestamp("occurredAt").notNull(),
  shift: mysqlEnum("shift", ["manha", "tarde", "noite"]).notNull(),
  area: mysqlEnum("area", ["recepcao", "producao", "embalagem", "expedicao", "manutencao"]).notNull(),
  tags: json("tags").notNull(), // Array de tags
  description: text("description").notNull(),
  impact: mysqlEnum("impact", ["nenhum", "baixo", "medio", "alto", "parada_total"]).default("nenhum"),
  downtimeMinutes: int("downtimeMinutes"),
  actionTaken: text("actionTaken"),
  photoUrl: varchar("photoUrl", { length: 500 }),
  status: mysqlEnum("status", ["aberto", "em_tratamento", "resolvido"]).default("aberto").notNull(),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: int("resolvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type ProductionIssue = typeof productionIssues.$inferSelect;
export type InsertProductionIssue = typeof productionIssues.$inferInsert;

// ============================================================================
// PURCHASE_REQUESTS TABLE (Solicitações de compra)
// ============================================================================
export const purchaseRequests = mysqlTable("purchase_requests", {
  id: int("id").autoincrement().primaryKey(),
  externalCode: varchar("externalCode", { length: 50 }),
  requestNumber: varchar("requestNumber", { length: 20 }).notNull().unique(),
  requestDate: timestamp("requestDate").defaultNow().notNull(),
  requesterId: int("requesterId"),
  requesterName: varchar("requesterName", { length: 255 }),
  sector: mysqlEnum("sector", ["producao", "qualidade", "manutencao", "administrativo", "almoxarifado"]).notNull(),
  urgency: mysqlEnum("urgency", ["baixa", "media", "alta", "critica"]).default("media").notNull(),
  deadlineDate: date("deadlineDate"),
  status: mysqlEnum("status", ["solicitado", "em_cotacao", "aguardando_aprovacao", "aprovado", "reprovado", "comprado", "entregue", "cancelado"]).default("solicitado").notNull(),
  totalEstimated: decimal("totalEstimated", { precision: 14, scale: 2 }),
  totalApproved: decimal("totalApproved", { precision: 14, scale: 2 }),
  chosenQuotationId: int("chosenQuotationId"),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"),
  approvalNotes: text("approvalNotes"),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type PurchaseRequest = typeof purchaseRequests.$inferSelect;
export type InsertPurchaseRequest = typeof purchaseRequests.$inferInsert;

// ============================================================================
// PURCHASE_REQUEST_ITEMS TABLE (Itens da solicitação de compra)
// ============================================================================
export const purchaseRequestItems = mysqlTable("purchase_request_items", {
  id: int("id").autoincrement().primaryKey(),
  purchaseRequestId: int("purchaseRequestId").notNull(),
  itemName: varchar("itemName", { length: 255 }).notNull(),
  specification: text("specification"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  estimatedValue: decimal("estimatedValue", { precision: 10, scale: 2 }),
  warehouseItemId: int("warehouseItemId"), // Se veio de sugestão automática
});

export type PurchaseRequestItem = typeof purchaseRequestItems.$inferSelect;
export type InsertPurchaseRequestItem = typeof purchaseRequestItems.$inferInsert;

// ============================================================================
// PURCHASE_QUOTATIONS TABLE (Cotações de compra)
// ============================================================================
export const purchaseQuotations = mysqlTable("purchase_quotations", {
  id: int("id").autoincrement().primaryKey(),
  purchaseRequestId: int("purchaseRequestId").notNull(),
  supplierName: varchar("supplierName", { length: 255 }).notNull(),
  supplierCnpj: varchar("supplierCnpj", { length: 20 }),
  supplierContact: varchar("supplierContact", { length: 255 }),
  supplierPhone: varchar("supplierPhone", { length: 20 }),
  supplierEmail: varchar("supplierEmail", { length: 320 }),
  totalValue: decimal("totalValue", { precision: 14, scale: 2 }).notNull(),
  deliveryDays: int("deliveryDays"),
  paymentCondition: varchar("paymentCondition", { length: 255 }),
  observations: text("observations"),
  quotationFileUrl: varchar("quotationFileUrl", { length: 500 }),
  isChosen: boolean("isChosen").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type PurchaseQuotation = typeof purchaseQuotations.$inferSelect;
export type InsertPurchaseQuotation = typeof purchaseQuotations.$inferInsert;

// ============================================================================
// PURCHASE_QUOTATION_ITEMS TABLE (Itens da cotação)
// ============================================================================
export const purchaseQuotationItems = mysqlTable("purchase_quotation_items", {
  id: int("id").autoincrement().primaryKey(),
  quotationId: int("quotationId").notNull(),
  requestItemId: int("requestItemId").notNull(),
  unitValue: decimal("unitValue", { precision: 10, scale: 2 }).notNull(),
  totalValue: decimal("totalValue", { precision: 10, scale: 2 }).notNull(),
  deliveryDays: varchar("deliveryDays", { length: 50 }),
  observations: text("observations"),
});

export type PurchaseQuotationItem = typeof purchaseQuotationItems.$inferSelect;
export type InsertPurchaseQuotationItem = typeof purchaseQuotationItems.$inferInsert;

// ============================================================================
// FINANCIAL_ENTRIES TABLE (Entradas financeiras - Contas a pagar e receber)
// ============================================================================
export const financialEntries = mysqlTable("financial_entries", {
  id: int("id").autoincrement().primaryKey(),
  externalCode: varchar("externalCode", { length: 50 }),
  entryType: mysqlEnum("entryType", ["pagar", "receber"]).notNull(),
  origin: mysqlEnum("origin", ["produtor", "compra", "venda", "outros"]).notNull(),
  referenceType: varchar("referenceType", { length: 50 }), // producer_payable, purchase_request, etc.
  referenceId: int("referenceId"),
  description: varchar("description", { length: 255 }).notNull(),
  entityName: varchar("entityName", { length: 255 }), // Nome do produtor, fornecedor ou cliente
  value: decimal("value", { precision: 14, scale: 2 }).notNull(),
  dueDate: date("dueDate").notNull(),
  status: mysqlEnum("status", ["pendente", "programado", "pago", "recebido", "atrasado", "cancelado"]).default("pendente").notNull(),
  paidAt: timestamp("paidAt"),
  paidBy: int("paidBy"),
  paymentMethod: mysqlEnum("paymentMethod", ["pix", "transferencia", "boleto", "dinheiro", "cheque"]),
  receiptUrl: varchar("receiptUrl", { length: 500 }),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type FinancialEntry = typeof financialEntries.$inferSelect;
export type InsertFinancialEntry = typeof financialEntries.$inferInsert;

// ============================================================================
// QUALITY_ANALYSES TABLE (Análises de qualidade)
// ============================================================================
export const qualityAnalyses = mysqlTable("quality_analyses", {
  id: int("id").autoincrement().primaryKey(),
  externalCode: varchar("externalCode", { length: 50 }),
  analysisDate: date("analysisDate").notNull(),
  analysisType: mysqlEnum("analysisType", ["microbiologica", "fisico_quimica", "sensorial", "outra"]).notNull(),
  relatedTo: mysqlEnum("relatedTo", ["carga_coco", "lote_producao", "nenhum"]).default("nenhum"),
  referenceId: int("referenceId"),
  skuId: int("skuId"),
  batchNumber: varchar("batchNumber", { length: 50 }),
  parameters: text("parameters").notNull(),
  results: text("results").notNull(),
  specificationLimits: text("specificationLimits"),
  result: mysqlEnum("result", ["conforme", "nao_conforme", "pendente"]).default("pendente").notNull(),
  responsibleId: int("responsibleId"),
  responsibleName: varchar("responsibleName", { length: 255 }),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type QualityAnalysis = typeof qualityAnalyses.$inferSelect;
export type InsertQualityAnalysis = typeof qualityAnalyses.$inferInsert;

// ============================================================================
// NON_CONFORMITIES TABLE (Não conformidades)
// ============================================================================
export const nonConformities = mysqlTable("non_conformities", {
  id: int("id").autoincrement().primaryKey(),
  externalCode: varchar("externalCode", { length: 50 }),
  ncNumber: varchar("ncNumber", { length: 20 }).notNull().unique(),
  identificationDate: date("identificationDate").notNull(),
  origin: mysqlEnum("origin", ["analise", "reclamacao_cliente", "auditoria", "processo", "fornecedor"]).notNull(),
  relatedAnalysisId: int("relatedAnalysisId"),
  area: mysqlEnum("area", ["recepcao", "producao", "embalagem", "expedicao", "qualidade", "almoxarifado"]).notNull(),
  description: text("description").notNull(),
  affectedProduct: varchar("affectedProduct", { length: 255 }),
  affectedQuantity: decimal("affectedQuantity", { precision: 10, scale: 2 }),
  immediateAction: text("immediateAction"),
  status: mysqlEnum("status", ["aberta", "em_analise", "acao_corretiva", "verificacao", "fechada"]).default("aberta").notNull(),
  closedAt: timestamp("closedAt"),
  closedBy: int("closedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type NonConformity = typeof nonConformities.$inferSelect;
export type InsertNonConformity = typeof nonConformities.$inferInsert;

// ============================================================================
// CORRECTIVE_ACTIONS TABLE (Ações corretivas)
// ============================================================================
export const correctiveActions = mysqlTable("corrective_actions", {
  id: int("id").autoincrement().primaryKey(),
  nonConformityId: int("nonConformityId").notNull(),
  rootCause: text("rootCause").notNull(),
  correctiveAction: text("correctiveAction").notNull(),
  responsibleId: int("responsibleId"),
  responsibleName: varchar("responsibleName", { length: 255 }),
  deadline: date("deadline").notNull(),
  status: mysqlEnum("status", ["pendente", "em_andamento", "concluida", "verificada"]).default("pendente").notNull(),
  effectivenessVerified: mysqlEnum("effectivenessVerified", ["sim", "nao"]),
  verificationNotes: text("verificationNotes"),
  completedAt: timestamp("completedAt"),
  completedBy: int("completedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type CorrectiveAction = typeof correctiveActions.$inferSelect;
export type InsertCorrectiveAction = typeof correctiveActions.$inferInsert;

// ============================================================================
// EMPLOYEES TABLE (Colaboradores - Gente & Cultura)
// ============================================================================
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  externalCode: varchar("externalCode", { length: 50 }),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull(),
  birthDate: date("birthDate"),
  position: varchar("position", { length: 100 }).notNull(),
  sector: mysqlEnum("sector", ["recepcao", "producao", "embalagem", "expedicao", "qualidade", "manutencao", "almoxarifado", "administrativo"]).notNull(),
  admissionDate: date("admissionDate").notNull(),
  phone: varchar("phone", { length: 20 }),
  emergencyContact: varchar("emergencyContact", { length: 255 }),
  status: mysqlEnum("status", ["ativo", "afastado", "desligado"]).default("ativo").notNull(),
  terminationDate: date("terminationDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ============================================================================
// EMPLOYEE_EVENTS TABLE (Eventos de presença - faltas, atrasos, horas extras)
// ============================================================================
export const employeeEvents = mysqlTable("employee_events", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  eventDate: date("eventDate").notNull(),
  eventType: mysqlEnum("eventType", ["falta_justificada", "falta_injustificada", "atraso", "saida_antecipada", "hora_extra", "atestado_medico"]).notNull(),
  hoursQuantity: decimal("hoursQuantity", { precision: 4, scale: 2 }), // Para horas extras
  reason: text("reason"),
  attachmentUrl: varchar("attachmentUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type EmployeeEvent = typeof employeeEvents.$inferSelect;
export type InsertEmployeeEvent = typeof employeeEvents.$inferInsert;

// ============================================================================
// EMPLOYEE_NOTES TABLE (Observações de colaboradores)
// ============================================================================
export const employeeNotes = mysqlTable("employee_notes", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  noteDate: date("noteDate").notNull(),
  noteType: mysqlEnum("noteType", ["elogio", "advertencia_verbal", "advertencia_escrita", "feedback", "observacao"]).notNull(),
  description: text("description").notNull(),
  attachmentUrl: varchar("attachmentUrl", { length: 500 }),
  visibility: mysqlEnum("visibility", ["restrito", "gestores"]).default("restrito").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type EmployeeNote = typeof employeeNotes.$inferSelect;
export type InsertEmployeeNote = typeof employeeNotes.$inferInsert;


// ============================================================================
// TAREFA 3: RBAC E SEGURANÇA
// ============================================================================

// ============================================================================
// USER_SESSIONS TABLE (Sessões de usuários)
// ============================================================================
export const userSessions = mysqlTable("user_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  userId: int("userId").notNull(),
  loginAt: timestamp("loginAt").defaultNow().notNull(),
  logoutAt: timestamp("logoutAt"),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  durationMinutes: int("durationMinutes"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  currentModule: varchar("currentModule", { length: 100 }),
  logoutReason: mysqlEnum("logoutReason", ["manual", "timeout", "forcado", "expirado"]),
  isActive: boolean("isActive").default(true).notNull(),
});

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;

// ============================================================================
// PASSWORD_HISTORY TABLE (Histórico de senhas)
// ============================================================================
export const passwordHistory = mysqlTable("password_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordHistory = typeof passwordHistory.$inferSelect;
export type InsertPasswordHistory = typeof passwordHistory.$inferInsert;

// ============================================================================
// LOGIN_ATTEMPTS TABLE (Tentativas de login)
// ============================================================================
export const loginAttempts = mysqlTable("login_attempts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  success: boolean("success").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  failReason: varchar("failReason", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = typeof loginAttempts.$inferInsert;

// ============================================================================
// SECURITY_ALERTS TABLE (Alertas de segurança)
// ============================================================================
export const securityAlerts = mysqlTable("security_alerts", {
  id: int("id").autoincrement().primaryKey(),
  alertType: mysqlEnum("alertType", ["login_bloqueado", "login_fora_horario", "acesso_negado", "multiplas_sessoes", "reset_senha"]).notNull(),
  priority: mysqlEnum("priority", ["baixa", "media", "alta"]).notNull(),
  userId: int("userId"),
  userName: varchar("userName", { length: 255 }),
  description: text("description").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  readBy: int("readBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SecurityAlert = typeof securityAlerts.$inferSelect;
export type InsertSecurityAlert = typeof securityAlerts.$inferInsert;

// ============================================================================
// SYSTEM_SETTINGS TABLE (Configurações do sistema)
// ============================================================================
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  settingType: mysqlEnum("settingType", ["string", "number", "boolean", "json"]).default("string").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

// ============================================================================
// PERMISSIONS CONSTANTS (Constantes de permissões - não é tabela)
// ============================================================================
// Permissões são definidas em código, não em banco de dados
// Isso simplifica a implementação e evita joins desnecessários

export const PERMISSIONS = {
  // Módulos
  MODULES: [
    "dashboard",
    "recebimento",
    "produtores",
    "pagamentos",
    "producao",
    "problemas",
    "almox_producao",
    "almox_geral",
    "estoque_pa",
    "compras",
    "financeiro",
    "qualidade",
    "rh",
    "administracao",
    "logs",
  ],
  
  // Ações
  ACTIONS: ["visualizar", "criar", "editar", "excluir", "aprovar", "exportar"],
  
  // Matriz de permissões por perfil
  ROLE_PERMISSIONS: {
    ceo: {
      dashboard: ["visualizar", "exportar"],
      recebimento: ["visualizar", "criar", "editar", "excluir", "exportar"],
      produtores: ["visualizar", "criar", "editar", "excluir", "exportar"],
      pagamentos: ["visualizar", "criar", "editar", "aprovar", "excluir", "exportar"],
      producao: ["visualizar", "criar", "editar", "excluir", "exportar"],
      problemas: ["visualizar", "criar", "editar", "excluir", "exportar"],
      almox_producao: ["visualizar", "criar", "editar", "excluir", "exportar"],
      almox_geral: ["visualizar", "criar", "editar", "excluir", "exportar"],
      estoque_pa: ["visualizar", "criar", "editar", "aprovar", "excluir", "exportar"],
      compras: ["visualizar", "criar", "editar", "aprovar", "excluir", "exportar"],
      financeiro: ["visualizar", "criar", "editar", "aprovar", "excluir", "exportar"],
      qualidade: ["visualizar", "criar", "editar", "excluir", "exportar"],
      rh: ["visualizar", "criar", "editar", "excluir", "exportar"],
      administracao: ["visualizar", "criar", "editar", "excluir", "exportar"],
      logs: ["visualizar", "exportar"],
    },
    admin: {
      dashboard: ["visualizar", "exportar"],
      recebimento: ["visualizar", "criar", "editar", "excluir", "exportar"],
      produtores: ["visualizar", "criar", "editar", "excluir", "exportar"],
      pagamentos: ["visualizar", "criar", "editar", "aprovar", "excluir", "exportar"],
      producao: ["visualizar", "criar", "editar", "excluir", "exportar"],
      problemas: ["visualizar", "criar", "editar", "excluir", "exportar"],
      almox_producao: ["visualizar", "criar", "editar", "excluir", "exportar"],
      almox_geral: ["visualizar", "criar", "editar", "excluir", "exportar"],
      estoque_pa: ["visualizar", "criar", "editar", "aprovar", "excluir", "exportar"],
      compras: ["visualizar", "criar", "editar", "aprovar", "excluir", "exportar"],
      financeiro: ["visualizar", "criar", "editar", "aprovar", "excluir", "exportar"],
      qualidade: ["visualizar", "criar", "editar", "excluir", "exportar"],
      rh: ["visualizar", "criar", "editar", "excluir", "exportar"],
      administracao: ["visualizar", "criar", "editar", "excluir", "exportar"],
      logs: ["visualizar", "exportar"],
    },
    recebimento: {
      dashboard: ["visualizar"],
      recebimento: ["visualizar", "criar", "editar", "exportar"],
      produtores: ["visualizar", "criar", "editar"],
      pagamentos: ["visualizar"],
      problemas: ["visualizar", "criar", "editar"],
    },
    producao: {
      dashboard: ["visualizar"],
      recebimento: ["visualizar"],
      producao: ["visualizar", "criar", "editar", "exportar"],
      problemas: ["visualizar", "criar", "editar", "exportar"],
      almox_producao: ["visualizar"],
      estoque_pa: ["visualizar", "editar"],
      qualidade: ["visualizar"],
    },
    almox_prod: {
      dashboard: ["visualizar"],
      almox_producao: ["visualizar", "criar", "editar", "exportar"],
      compras: ["visualizar", "criar"],
      problemas: ["visualizar", "criar", "editar"],
      qualidade: ["visualizar"],
    },
    almox_geral: {
      dashboard: ["visualizar"],
      almox_geral: ["visualizar", "criar", "editar", "exportar"],
      compras: ["visualizar", "criar"],
      problemas: ["visualizar", "criar", "editar"],
    },
    qualidade: {
      dashboard: ["visualizar"],
      recebimento: ["visualizar"],
      producao: ["visualizar"],
      qualidade: ["visualizar", "criar", "editar", "exportar"],
      problemas: ["visualizar", "criar", "editar"],
    },
    compras: {
      dashboard: ["visualizar"],
      almox_producao: ["visualizar"],
      almox_geral: ["visualizar"],
      compras: ["visualizar", "criar", "editar", "exportar"],
      financeiro: ["visualizar"],
    },
    financeiro: {
      dashboard: ["visualizar"],
      recebimento: ["visualizar"],
      produtores: ["visualizar"],
      pagamentos: ["visualizar", "criar", "editar", "aprovar", "exportar"],
      compras: ["visualizar", "aprovar"],
      financeiro: ["visualizar", "criar", "editar", "aprovar", "exportar"],
    },
    rh: {
      dashboard: ["visualizar"],
      rh: ["visualizar", "criar", "editar", "exportar"],
    },
    consulta: {
      dashboard: ["visualizar"],
      recebimento: ["visualizar"],
      produtores: ["visualizar"],
      pagamentos: ["visualizar"],
      producao: ["visualizar"],
      problemas: ["visualizar"],
      almox_producao: ["visualizar"],
      almox_geral: ["visualizar"],
      estoque_pa: ["visualizar"],
      compras: ["visualizar"],
      financeiro: ["visualizar"],
      qualidade: ["visualizar"],
    },
    user: {
      dashboard: ["visualizar"],
    },
  },
} as const;

// Helper function to check permission
export function hasPermission(role: string, module: string, action: string): boolean {
  const rolePerms = PERMISSIONS.ROLE_PERMISSIONS[role as keyof typeof PERMISSIONS.ROLE_PERMISSIONS];
  if (!rolePerms) return false;
  
  const modulePerms = rolePerms[module as keyof typeof rolePerms];
  if (!modulePerms) return false;
  
  return (modulePerms as readonly string[]).includes(action);
}


// ============================================================================
// AI COPILOT TABLES
// ============================================================================

// ai_events - Log de eventos do ERP (o "fio" que liga tudo)
export const aiEvents = mysqlTable("ai_events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 100 }).notNull(), // 'coconut_load.created', 'payable.approved'
  module: varchar("module", { length: 50 }).notNull(), // 'recebimento', 'producao', etc.
  entityType: varchar("entityType", { length: 50 }).notNull(), // 'coconut_load', 'producer_payable'
  entityId: int("entityId").notNull(),
  producerId: int("producerId"), // FK opcional para contexto
  skuId: int("skuId"), // FK opcional para contexto
  payload: json("payload"), // Dados relevantes do evento
  metadata: json("metadata"), // Contexto adicional (IP, user-agent)
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AIEvent = typeof aiEvents.$inferSelect;
export type InsertAIEvent = typeof aiEvents.$inferInsert;

// ai_insights - Insights gerados pela IA
export const aiInsights = mysqlTable("ai_insights", {
  id: int("id").autoincrement().primaryKey(),
  insightType: varchar("insightType", { length: 50 }).notNull(), // 'stock_alert', 'payment_overdue', 'anomaly'
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  details: json("details"), // Dados estruturados do insight
  evidenceIds: json("evidenceIds"), // Array de ai_sources.id
  module: varchar("module", { length: 50 }), // Módulo relacionado
  entityType: varchar("entityType", { length: 50 }), // Tipo de entidade relacionada
  entityId: int("entityId"), // ID da entidade relacionada
  status: mysqlEnum("status", ["active", "dismissed", "resolved"]).default("active").notNull(),
  dismissedBy: int("dismissedBy"),
  dismissedAt: timestamp("dismissedAt"),
  resolvedAt: timestamp("resolvedAt"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type AIInsight = typeof aiInsights.$inferSelect;
export type InsertAIInsight = typeof aiInsights.$inferInsert;

// ai_alerts - Alertas enviados/pendentes
export const aiAlerts = mysqlTable("ai_alerts", {
  id: int("id").autoincrement().primaryKey(),
  insightId: int("insightId"), // FK ai_insights (opcional)
  alertType: varchar("alertType", { length: 50 }).notNull(), // 'stock_critical', 'payment_overdue'
  channel: mysqlEnum("channel", ["email", "whatsapp", "push", "in_app"]).notNull(),
  recipientUserId: int("recipientUserId"), // FK users
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  recipientPhone: varchar("recipientPhone", { length: 20 }),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "read"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  readAt: timestamp("readAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AIAlert = typeof aiAlerts.$inferSelect;
export type InsertAIAlert = typeof aiAlerts.$inferInsert;

// ai_conversations - Threads de chat por usuário
export const aiConversations = mysqlTable("ai_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK users
  title: varchar("title", { length: 255 }),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AIConversation = typeof aiConversations.$inferSelect;
export type InsertAIConversation = typeof aiConversations.$inferInsert;

// ai_messages - Mensagens do chat
export const aiMessages = mysqlTable("ai_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(), // FK ai_conversations
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  sourceIds: json("sourceIds"), // Array de ai_sources.id usados na resposta
  tokensUsed: int("tokensUsed"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AIMessage = typeof aiMessages.$inferSelect;
export type InsertAIMessage = typeof aiMessages.$inferInsert;

// ai_actions - Ações sugeridas pela IA
export const aiActions = mysqlTable("ai_actions", {
  id: int("id").autoincrement().primaryKey(),
  insightId: int("insightId"), // FK ai_insights (opcional)
  conversationId: int("conversationId"), // FK ai_conversations (opcional)
  actionType: varchar("actionType", { length: 50 }).notNull(), // 'create_purchase_request', 'open_nc'
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  targetModule: varchar("targetModule", { length: 50 }).notNull(), // 'purchases', 'quality', 'financial'
  targetMutation: varchar("targetMutation", { length: 100 }).notNull(), // 'purchases.create'
  payload: json("payload").notNull(), // Dados para executar a ação
  status: mysqlEnum("status", ["suggested", "approved", "rejected", "executed", "failed"]).default("suggested").notNull(),
  suggestedAt: timestamp("suggestedAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type AIAction = typeof aiActions.$inferSelect;
export type InsertAIAction = typeof aiActions.$inferInsert;

// ai_action_approvals - Aprovações de ações
export const aiActionApprovals = mysqlTable("ai_action_approvals", {
  id: int("id").autoincrement().primaryKey(),
  actionId: int("actionId").notNull(), // FK ai_actions
  userId: int("userId").notNull(), // FK users (quem aprovou/rejeitou)
  decision: mysqlEnum("decision", ["approved", "rejected"]).notNull(),
  reason: text("reason"), // Motivo (obrigatório se rejected)
  decidedAt: timestamp("decidedAt").defaultNow().notNull(),
  executedAt: timestamp("executedAt"),
  executionResult: json("executionResult"), // Resultado da execução
});

export type AIActionApproval = typeof aiActionApprovals.$inferSelect;
export type InsertAIActionApproval = typeof aiActionApprovals.$inferInsert;

// ai_sources - Evidências/fontes usadas nas respostas
export const aiSources = mysqlTable("ai_sources", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entityType", { length: 50 }).notNull(), // 'coconut_load', 'producer_payable'
  entityId: int("entityId").notNull(),
  label: varchar("label", { length: 255 }).notNull(), // "Carga #123 - Produtor João"
  url: varchar("url", { length: 500 }), // Link interno: /recebimento?id=123
  snippet: text("snippet"), // Trecho relevante (notes, description)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AISource = typeof aiSources.$inferSelect;
export type InsertAISource = typeof aiSources.$inferInsert;

// ai_feedback - Feedback do usuário (like/dislike)
export const aiFeedback = mysqlTable("ai_feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK users
  messageId: int("messageId"), // FK ai_messages (opcional)
  insightId: int("insightId"), // FK ai_insights (opcional)
  feedbackType: mysqlEnum("feedbackType", ["like", "dislike"]).notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AIFeedback = typeof aiFeedback.$inferSelect;
export type InsertAIFeedback = typeof aiFeedback.$inferInsert;

// ai_config - Configurações do Copiloto IA
export const aiConfig = mysqlTable("ai_config", {
  id: int("id").autoincrement().primaryKey(),
  configKey: varchar("configKey", { length: 100 }).notNull().unique(),
  configValue: json("configValue").notNull(),
  description: text("description"),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AIConfig = typeof aiConfig.$inferSelect;
export type InsertAIConfig = typeof aiConfig.$inferInsert;
