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
  role: mysqlEnum("role", ["user", "admin", "gerente", "ceo", "recebimento", "producao", "almox_prod", "almox_geral", "qualidade", "compras", "financeiro", "rh", "consulta"]).default("user").notNull(),
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
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }).default("0"),
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

// ai_sources - Evidências/fontes usadas nas respostas (com suporte multimodal)
export const aiSources = mysqlTable("ai_sources", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entityType", { length: 50 }).notNull(), // 'coconut_load', 'producer_payable', 'attachment'
  entityId: int("entityId").notNull(),
  label: varchar("label", { length: 255 }).notNull(), // "Carga #123 - Produtor João"
  url: varchar("url", { length: 500 }), // Link interno: /recebimento?id=123
  snippet: text("snippet"), // Trecho relevante (notes, description)
  
  // Campos Multimodal (Bloco 6/9)
  attachmentUrl: varchar("attachmentUrl", { length: 500 }), // URL do arquivo original (S3)
  attachmentType: mysqlEnum("attachmentType", ["image", "pdf", "document", "video", "audio"]),
  extractedText: text("extractedText"), // Texto extraído via OCR
  extractedEntities: json("extractedEntities"), // Entidades extraídas: [{type: 'pH', value: '5.2', confidence: 0.98}]
  boundingBoxes: json("boundingBoxes"), // Coordenadas para highlights: [{x, y, w, h, text}]
  confidenceScore: decimal("confidenceScore", { precision: 5, scale: 4 }), // Score de confiança OCR (0.0000-1.0000)
  processingStatus: mysqlEnum("processingStatus", ["pending", "processing", "completed", "failed"]).default("pending"),
  processingError: text("processingError"), // Mensagem de erro se falhou
  processedAt: timestamp("processedAt"), // Quando foi processado
  processedBy: varchar("processedBy", { length: 50 }), // 'google_vision', 'tesseract', 'manual'
  
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

// ai_predictions - Previsões geradas por modelos ML
export const aiPredictions = mysqlTable("ai_predictions", {
  id: int("id").autoincrement().primaryKey(),
  modelType: varchar("modelType", { length: 50 }).notNull(),
  module: varchar("module", { length: 50 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId").notNull(),
  period: varchar("period", { length: 20 }).notNull(),
  inputJson: json("inputJson").notNull(),
  outputJson: json("outputJson").notNull(),
  accuracyEstimate: decimal("accuracyEstimate", { precision: 5, scale: 2 }).default("0"),
  validationScore: decimal("validationScore", { precision: 5, scale: 2 }),
  lastValidatedAt: timestamp("lastValidatedAt"),
  feedbackAggregate: json("feedbackAggregate"),
  provider: mysqlEnum("provider", ["local_scikit", "aws_sagemaker", "hybrid"]).default("local_scikit").notNull(),
  executionTimeMs: int("executionTimeMs"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AIPrediction = typeof aiPredictions.$inferSelect;
export type InsertAIPrediction = typeof aiPredictions.$inferInsert;


// ============================================================================
// BLOCO 8/9: FEEDBACK AVANÇADO E ANALYTICS
// ============================================================================

// ai_feedback_advanced - Feedback detalhado com analytics
export const aiFeedbackAdvanced = mysqlTable("ai_feedback_advanced", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK users
  messageId: int("messageId"), // FK ai_messages (opcional)
  insightId: int("insightId"), // FK ai_insights (opcional)
  actionId: int("actionId"), // FK ai_actions (opcional)
  predictionId: int("predictionId"), // FK ai_predictions (opcional)
  
  // Rating obrigatório (1-5 estrelas)
  rating: int("rating").notNull(), // 1-5
  feedbackType: mysqlEnum("feedbackType", ["like", "dislike", "neutral"]).notNull(),
  
  // Comentário obrigatório
  comment: text("comment").notNull(),
  
  // Áreas de melhoria selecionadas
  improvementAreas: json("improvementAreas"), // ['accuracy', 'relevance', 'clarity', 'completeness', 'actionability']
  
  // Contexto da interação
  interactionType: mysqlEnum("interactionType", ["chat", "insight", "alert", "action", "prediction"]).notNull(),
  responseTimeMs: int("responseTimeMs"), // Tempo de resposta do Copiloto
  sessionDuration: int("sessionDuration"), // Duração da sessão em segundos
  
  // Idioma da interação
  language: varchar("language", { length: 10 }).default("pt-BR"),
  
  // A/B Testing
  experimentId: varchar("experimentId", { length: 50 }), // ID do experimento A/B
  variant: varchar("variant", { length: 20 }), // 'control' ou 'treatment'
  
  // Metadados para ML
  contextSnapshot: json("contextSnapshot"), // Estado do contexto no momento do feedback
  userSegment: varchar("userSegment", { length: 50 }), // 'ceo', 'admin', 'operator'
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"), // Quando foi processado para retrain
  processedForRetrain: boolean("processedForRetrain").default(false),
});

export type AIFeedbackAdvanced = typeof aiFeedbackAdvanced.$inferSelect;
export type InsertAIFeedbackAdvanced = typeof aiFeedbackAdvanced.$inferInsert;

// ai_retrain_logs - Logs de retreinamento de modelos
export const aiRetrainLogs = mysqlTable("ai_retrain_logs", {
  id: int("id").autoincrement().primaryKey(),
  modelType: varchar("modelType", { length: 50 }).notNull(), // 'demand_forecast', 'quality_prediction'
  triggerType: mysqlEnum("triggerType", ["scheduled", "feedback_threshold", "manual"]).notNull(),
  
  // Métricas antes do retrain
  previousAccuracy: decimal("previousAccuracy", { precision: 5, scale: 4 }),
  previousFeedbackScore: decimal("previousFeedbackScore", { precision: 5, scale: 4 }),
  
  // Métricas após retrain
  newAccuracy: decimal("newAccuracy", { precision: 5, scale: 4 }),
  newFeedbackScore: decimal("newFeedbackScore", { precision: 5, scale: 4 }),
  
  // Dados do retrain
  feedbackCount: int("feedbackCount").notNull(), // Quantidade de feedbacks usados
  dataPointsUsed: int("dataPointsUsed").notNull(), // Quantidade de dados de treino
  trainingDurationMs: int("trainingDurationMs"),
  
  // Configurações ajustadas
  thresholdsAdjusted: json("thresholdsAdjusted"), // Thresholds que foram ajustados
  parametersChanged: json("parametersChanged"), // Parâmetros do modelo alterados
  
  // Status
  status: mysqlEnum("status", ["started", "completed", "failed", "rolled_back"]).default("started").notNull(),
  errorMessage: text("errorMessage"),
  
  // Auditoria LGPD
  dataRetentionDays: int("dataRetentionDays").default(365), // Retenção de dados
  anonymizationApplied: boolean("anonymizationApplied").default(true),
  
  // Timestamps
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  createdBy: int("createdBy"), // FK users (quem iniciou manual)
});

export type AIRetrainLog = typeof aiRetrainLogs.$inferSelect;
export type InsertAIRetrainLog = typeof aiRetrainLogs.$inferInsert;

// ai_performance_reports - Relatórios de performance do Copiloto
export const aiPerformanceReports = mysqlTable("ai_performance_reports", {
  id: int("id").autoincrement().primaryKey(),
  reportType: mysqlEnum("reportType", ["monthly", "quarterly", "annual"]).notNull(),
  periodStart: date("periodStart").notNull(),
  periodEnd: date("periodEnd").notNull(),
  
  // Métricas de interação
  totalInteractions: int("totalInteractions").notNull(),
  uniqueUsers: int("uniqueUsers").notNull(),
  avgSessionDuration: int("avgSessionDuration"), // segundos
  
  // Métricas de feedback
  totalFeedbacks: int("totalFeedbacks").notNull(),
  feedbackRate: decimal("feedbackRate", { precision: 5, scale: 4 }), // % de interações com feedback
  avgRating: decimal("avgRating", { precision: 3, scale: 2 }), // Média de rating (1-5)
  satisfactionRate: decimal("satisfactionRate", { precision: 5, scale: 4 }), // % de ratings >= 4
  
  // Métricas de eficiência
  suggestionAcceptanceRate: decimal("suggestionAcceptanceRate", { precision: 5, scale: 4 }),
  alertAccuracyRate: decimal("alertAccuracyRate", { precision: 5, scale: 4 }),
  predictionAccuracyRate: decimal("predictionAccuracyRate", { precision: 5, scale: 4 }),
  
  // Métricas por idioma
  interactionsByLanguage: json("interactionsByLanguage"), // { 'pt-BR': 1000, 'en': 200, 'es': 50 }
  
  // Métricas de A/B Testing
  abTestResults: json("abTestResults"), // Resultados dos experimentos
  
  // Insights gerados
  insightsGenerated: int("insightsGenerated").notNull(),
  insightsResolved: int("insightsResolved").notNull(),
  insightsDismissed: int("insightsDismissed").notNull(),
  
  // Ações
  actionssuggested: int("actionsSuggested").notNull(),
  actionsApproved: int("actionsApproved").notNull(),
  actionsExecuted: int("actionsExecuted").notNull(),
  
  // Previsões
  predictionsGenerated: int("predictionsGenerated").notNull(),
  predictionsValidated: int("predictionsValidated").notNull(),
  
  // Tendências
  trend: mysqlEnum("trend", ["improving", "stable", "declining"]).default("stable"),
  trendDetails: json("trendDetails"), // Detalhes da análise de tendência
  
  // Recomendações automáticas
  recommendations: json("recommendations"), // Sugestões de melhoria geradas
  
  // Timestamps
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  generatedBy: int("generatedBy"), // FK users ou 0 para sistema
});

export type AIPerformanceReport = typeof aiPerformanceReports.$inferSelect;
export type InsertAIPerformanceReport = typeof aiPerformanceReports.$inferInsert;

// ai_ab_experiments - Experimentos A/B
export const aiAbExperiments = mysqlTable("ai_ab_experiments", {
  id: int("id").autoincrement().primaryKey(),
  experimentId: varchar("experimentId", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Configuração do experimento
  feature: varchar("feature", { length: 100 }).notNull(), // 'chat_response_format', 'insight_threshold'
  controlConfig: json("controlConfig").notNull(), // Configuração do grupo controle
  treatmentConfig: json("treatmentConfig").notNull(), // Configuração do grupo tratamento
  
  // Alocação de tráfego
  trafficAllocation: decimal("trafficAllocation", { precision: 3, scale: 2 }).default("0.50"), // % para treatment
  
  // Métricas alvo
  primaryMetric: varchar("primaryMetric", { length: 100 }).notNull(), // 'satisfaction_rate', 'feedback_rate'
  secondaryMetrics: json("secondaryMetrics"), // Métricas secundárias
  
  // Resultados
  controlSampleSize: int("controlSampleSize").default(0),
  treatmentSampleSize: int("treatmentSampleSize").default(0),
  controlMetricValue: decimal("controlMetricValue", { precision: 10, scale: 4 }),
  treatmentMetricValue: decimal("treatmentMetricValue", { precision: 10, scale: 4 }),
  statisticalSignificance: decimal("statisticalSignificance", { precision: 5, scale: 4 }),
  
  // Status
  status: mysqlEnum("status", ["draft", "running", "paused", "completed", "cancelled"]).default("draft").notNull(),
  winner: mysqlEnum("winner", ["control", "treatment", "inconclusive"]),
  
  // Timestamps
  startedAt: timestamp("startedAt"),
  endedAt: timestamp("endedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(),
});

export type AIAbExperiment = typeof aiAbExperiments.$inferSelect;
export type InsertAIAbExperiment = typeof aiAbExperiments.$inferInsert;


// ============================================================================
// EQUIPAMENTOS E MANUTENÇÃO
// ============================================================================
export const equipments = mysqlTable("equipments", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["secadora", "ralador", "peneira", "embaladora", "balanca", "esteira", "lavadora", "outro"]).notNull(),
  manufacturer: varchar("manufacturer", { length: 255 }),
  model: varchar("model", { length: 100 }),
  serialNumber: varchar("serialNumber", { length: 100 }),
  location: varchar("location", { length: 100 }),
  acquisitionDate: date("acquisitionDate"),
  acquisitionCost: decimal("acquisitionCost", { precision: 14, scale: 2 }),
  warrantyExpiration: date("warrantyExpiration"),
  status: mysqlEnum("status", ["operacional", "manutencao", "parado", "desativado"]).default("operacional").notNull(),
  lastMaintenanceDate: date("lastMaintenanceDate"),
  nextMaintenanceDate: date("nextMaintenanceDate"),
  maintenanceIntervalDays: int("maintenanceIntervalDays").default(90),
  hourMeter: decimal("hourMeter", { precision: 10, scale: 2 }).default("0"),
  specifications: json("specifications"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Equipment = typeof equipments.$inferSelect;
export type InsertEquipment = typeof equipments.$inferInsert;

export const maintenanceRecords = mysqlTable("maintenance_records", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipmentId").notNull(),
  type: mysqlEnum("type", ["preventiva", "corretiva", "preditiva", "emergencial"]).notNull(),
  description: text("description").notNull(),
  cause: text("cause"),
  solution: text("solution"),
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt"),
  downtimeMinutes: int("downtimeMinutes"),
  cost: decimal("cost", { precision: 14, scale: 2 }),
  laborCost: decimal("laborCost", { precision: 14, scale: 2 }),
  partsCost: decimal("partsCost", { precision: 14, scale: 2 }),
  technicianName: varchar("technicianName", { length: 255 }),
  externalService: boolean("externalService").default(false),
  status: mysqlEnum("status", ["agendada", "em_andamento", "concluida", "cancelada"]).default("agendada").notNull(),
  priority: mysqlEnum("priority", ["baixa", "media", "alta", "critica"]).default("media").notNull(),
  photoUrl: varchar("photoUrl", { length: 500 }),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InsertMaintenanceRecord = typeof maintenanceRecords.$inferInsert;

// ============================================================================
// ORDENS DE PRODUÇÃO
// ============================================================================
export const productionOrders = mysqlTable("production_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 20 }).notNull().unique(),
  skuId: int("skuId").notNull(),
  variation: mysqlEnum("variation", ["flocos", "medio", "fino"]).notNull(),
  plannedQuantity: decimal("plannedQuantity", { precision: 10, scale: 2 }).notNull(),
  producedQuantity: decimal("producedQuantity", { precision: 10, scale: 2 }).default("0"),
  plannedStartDate: date("plannedStartDate").notNull(),
  plannedEndDate: date("plannedEndDate"),
  actualStartDate: timestamp("actualStartDate"),
  actualEndDate: timestamp("actualEndDate"),
  priority: mysqlEnum("priority", ["baixa", "normal", "alta", "urgente"]).default("normal").notNull(),
  status: mysqlEnum("status", ["aguardando", "em_producao", "qualidade", "concluida", "cancelada"]).default("aguardando").notNull(),
  batchNumber: varchar("batchNumber", { length: 50 }),
  estimatedYield: decimal("estimatedYield", { precision: 5, scale: 2 }),
  actualYield: decimal("actualYield", { precision: 5, scale: 2 }),
  observations: text("observations"),
  kanbanColumn: mysqlEnum("kanbanColumn", ["backlog", "aguardando", "em_producao", "qualidade", "concluida"]).default("backlog"),
  kanbanPosition: int("kanbanPosition").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductionOrder = typeof productionOrders.$inferSelect;
export type InsertProductionOrder = typeof productionOrders.$inferInsert;

// ============================================================================
// ETAPAS DE PRODUÇÃO
// ============================================================================
export const productionStages = mysqlTable("production_stages", {
  id: int("id").autoincrement().primaryKey(),
  productionOrderId: int("productionOrderId").notNull(),
  stage: mysqlEnum("stage", ["recepcao", "selecao", "lavagem", "ralagem", "secagem", "peneiramento", "embalagem"]).notNull(),
  sequence: int("sequence").notNull(),
  equipmentId: int("equipmentId"),
  responsibleId: int("responsibleId"),
  responsibleName: varchar("responsibleName", { length: 255 }),
  plannedDurationMinutes: int("plannedDurationMinutes"),
  actualDurationMinutes: int("actualDurationMinutes"),
  inputQuantity: decimal("inputQuantity", { precision: 10, scale: 2 }),
  outputQuantity: decimal("outputQuantity", { precision: 10, scale: 2 }),
  lossQuantity: decimal("lossQuantity", { precision: 10, scale: 2 }).default("0"),
  lossReason: text("lossReason"),
  temperature: decimal("temperature", { precision: 5, scale: 2 }),
  humidity: decimal("humidity", { precision: 5, scale: 2 }),
  status: mysqlEnum("status", ["pendente", "em_andamento", "concluida", "pulada"]).default("pendente").notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductionStage = typeof productionStages.$inferSelect;
export type InsertProductionStage = typeof productionStages.$inferInsert;

// ============================================================================
// PARADAS DE PRODUÇÃO
// ============================================================================
export const productionStops = mysqlTable("production_stops", {
  id: int("id").autoincrement().primaryKey(),
  productionOrderId: int("productionOrderId"),
  equipmentId: int("equipmentId"),
  shift: mysqlEnum("shift", ["manha", "tarde", "noite"]).notNull(),
  stopDate: date("stopDate").notNull(),
  reason: mysqlEnum("reason", ["setup", "manutencao_preventiva", "manutencao_corretiva", "falta_material", "falta_operador", "quebra", "limpeza", "qualidade", "energia", "outro"]).notNull(),
  reasonDetail: text("reasonDetail"),
  startedAt: timestamp("startedAt").notNull(),
  endedAt: timestamp("endedAt"),
  durationMinutes: int("durationMinutes"),
  plannedStop: boolean("plannedStop").default(false),
  productionLostKg: decimal("productionLostKg", { precision: 10, scale: 2 }),
  costImpact: decimal("costImpact", { precision: 14, scale: 2 }),
  actionTaken: text("actionTaken"),
  preventable: boolean("preventable"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type ProductionStop = typeof productionStops.$inferSelect;
export type InsertProductionStop = typeof productionStops.$inferInsert;

// ============================================================================
// REPROCESSO
// ============================================================================
export const productionReprocesses = mysqlTable("production_reprocesses", {
  id: int("id").autoincrement().primaryKey(),
  originalBatchNumber: varchar("originalBatchNumber", { length: 50 }).notNull(),
  newBatchNumber: varchar("newBatchNumber", { length: 50 }),
  productionOrderId: int("productionOrderId"),
  skuId: int("skuId").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  reason: mysqlEnum("reason", ["umidade_alta", "granulometria", "cor", "contaminacao_leve", "embalagem_danificada", "outro"]).notNull(),
  reasonDetail: text("reasonDetail"),
  reprocessDate: date("reprocessDate").notNull(),
  reprocessedQuantity: decimal("reprocessedQuantity", { precision: 10, scale: 2 }),
  lossQuantity: decimal("lossQuantity", { precision: 10, scale: 2 }),
  additionalCost: decimal("additionalCost", { precision: 14, scale: 2 }),
  status: mysqlEnum("status", ["aguardando", "em_reprocesso", "concluido", "descartado"]).default("aguardando").notNull(),
  qualityApproved: boolean("qualityApproved"),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type ProductionReprocess = typeof productionReprocesses.$inferSelect;
export type InsertProductionReprocess = typeof productionReprocesses.$inferInsert;

// ============================================================================
// METAS DE PRODUÇÃO
// ============================================================================
export const productionGoals = mysqlTable("production_goals", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["diaria", "semanal", "mensal", "turno"]).notNull(),
  shift: mysqlEnum("shift", ["manha", "tarde", "noite", "todos"]),
  skuId: int("skuId"),
  targetQuantity: decimal("targetQuantity", { precision: 10, scale: 2 }).notNull(),
  targetYield: decimal("targetYield", { precision: 5, scale: 2 }),
  maxLossPercent: decimal("maxLossPercent", { precision: 5, scale: 2 }),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  status: mysqlEnum("status", ["ativa", "inativa", "concluida"]).default("ativa").notNull(),
  achievedQuantity: decimal("achievedQuantity", { precision: 10, scale: 2 }).default("0"),
  achievedPercent: decimal("achievedPercent", { precision: 5, scale: 2 }).default("0"),
  achievedAt: timestamp("achievedAt"),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type ProductionGoal = typeof productionGoals.$inferSelect;
export type InsertProductionGoal = typeof productionGoals.$inferInsert;

// ============================================================================
// CHECKLIST DE TURNO
// ============================================================================
export const shiftChecklists = mysqlTable("shift_checklists", {
  id: int("id").autoincrement().primaryKey(),
  checklistDate: date("checklistDate").notNull(),
  shift: mysqlEnum("shift", ["manha", "tarde", "noite"]).notNull(),
  responsibleId: int("responsibleId"),
  responsibleName: varchar("responsibleName", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pendente", "em_andamento", "concluido", "incompleto"]).default("pendente").notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  totalItems: int("totalItems").default(0),
  completedItems: int("completedItems").default(0),
  blocksProduction: boolean("blocksProduction").default(true),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ShiftChecklist = typeof shiftChecklists.$inferSelect;
export type InsertShiftChecklist = typeof shiftChecklists.$inferInsert;

export const checklistItems = mysqlTable("checklist_items", {
  id: int("id").autoincrement().primaryKey(),
  checklistId: int("checklistId").notNull(),
  category: mysqlEnum("category", ["limpeza", "epi", "calibracao", "seguranca", "qualidade", "documentacao"]).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  required: boolean("required").default(true),
  checked: boolean("checked").default(false),
  checkedAt: timestamp("checkedAt"),
  checkedBy: int("checkedBy"),
  photoUrl: varchar("photoUrl", { length: 500 }),
  observations: text("observations"),
  nonConformity: boolean("nonConformity").default(false),
});

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = typeof checklistItems.$inferInsert;

// ============================================================================
// TEMPLATES DE CHECKLIST
// ============================================================================
export const checklistTemplates = mysqlTable("checklist_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  shift: mysqlEnum("shift", ["manha", "tarde", "noite", "todos"]).default("todos"),
  active: boolean("active").default(true),
  items: json("items").notNull(), // Array de { category, description, required }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type InsertChecklistTemplate = typeof checklistTemplates.$inferInsert;

// ============================================================================
// LEITURAS DE SENSORES (IoT)
// ============================================================================
export const sensorReadings = mysqlTable("sensor_readings", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipmentId"),
  sensorType: mysqlEnum("sensorType", ["temperatura", "umidade", "peso", "pressao", "vibracao", "energia"]).notNull(),
  sensorCode: varchar("sensorCode", { length: 50 }),
  value: decimal("value", { precision: 10, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  minLimit: decimal("minLimit", { precision: 10, scale: 4 }),
  maxLimit: decimal("maxLimit", { precision: 10, scale: 4 }),
  outOfSpec: boolean("outOfSpec").default(false),
  productionOrderId: int("productionOrderId"),
  batchNumber: varchar("batchNumber", { length: 50 }),
  readAt: timestamp("readAt").defaultNow().notNull(),
  source: mysqlEnum("source", ["manual", "automatico", "iot"]).default("manual"),
});

export type SensorReading = typeof sensorReadings.$inferSelect;
export type InsertSensorReading = typeof sensorReadings.$inferInsert;

// ============================================================================
// DOCUMENTOS E COMPLIANCE
// ============================================================================
export const complianceDocuments = mysqlTable("compliance_documents", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["alvara", "licenca_ambiental", "licenca_sanitaria", "certificado", "iso", "organico", "outro"]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  documentNumber: varchar("documentNumber", { length: 100 }),
  issuingBody: varchar("issuingBody", { length: 255 }),
  issueDate: date("issueDate"),
  expirationDate: date("expirationDate"),
  renewalAlertDays: int("renewalAlertDays").default(30),
  status: mysqlEnum("status", ["vigente", "vencido", "em_renovacao", "cancelado"]).default("vigente").notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ComplianceDocument = typeof complianceDocuments.$inferSelect;
export type InsertComplianceDocument = typeof complianceDocuments.$inferInsert;

// ============================================================================
// CLIENTES (para Agente de Vendas)
// ============================================================================
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  externalCode: varchar("externalCode", { length: 50 }),
  name: varchar("name", { length: 255 }).notNull(),
  tradeName: varchar("tradeName", { length: 255 }),
  cpfCnpj: varchar("cpfCnpj", { length: 20 }).notNull(),
  type: mysqlEnum("type", ["varejo", "atacado", "industria", "distribuidor", "exportacao"]).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  contactName: varchar("contactName", { length: 255 }),
  paymentTerms: varchar("paymentTerms", { length: 100 }),
  creditLimit: decimal("creditLimit", { precision: 14, scale: 2 }),
  status: mysqlEnum("status", ["ativo", "inativo", "bloqueado"]).default("ativo").notNull(),
  firstPurchaseDate: date("firstPurchaseDate"),
  lastPurchaseDate: date("lastPurchaseDate"),
  totalPurchases: decimal("totalPurchases", { precision: 14, scale: 2 }).default("0"),
  averageTicket: decimal("averageTicket", { precision: 14, scale: 2 }).default("0"),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ============================================================================
// PEDIDOS DE VENDA (para Agente de Vendas)
// ============================================================================
export const salesOrders = mysqlTable("sales_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 20 }).notNull().unique(),
  customerId: int("customerId").notNull(),
  orderDate: timestamp("orderDate").defaultNow().notNull(),
  deliveryDate: date("deliveryDate"),
  status: mysqlEnum("status", ["orcamento", "confirmado", "em_separacao", "faturado", "enviado", "entregue", "cancelado"]).default("orcamento").notNull(),
  totalValue: decimal("totalValue", { precision: 14, scale: 2 }).notNull(),
  discountPercent: decimal("discountPercent", { precision: 5, scale: 2 }).default("0"),
  discountValue: decimal("discountValue", { precision: 14, scale: 2 }).default("0"),
  netValue: decimal("netValue", { precision: 14, scale: 2 }).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 100 }),
  paymentTerms: varchar("paymentTerms", { length: 100 }),
  shippingMethod: varchar("shippingMethod", { length: 100 }),
  shippingCost: decimal("shippingCost", { precision: 14, scale: 2 }).default("0"),
  observations: text("observations"),
  internalNotes: text("internalNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SalesOrder = typeof salesOrders.$inferSelect;
export type InsertSalesOrder = typeof salesOrders.$inferInsert;

export const salesOrderItems = mysqlTable("sales_order_items", {
  id: int("id").autoincrement().primaryKey(),
  salesOrderId: int("salesOrderId").notNull(),
  skuId: int("skuId").notNull(),
  variation: mysqlEnum("variation", ["flocos", "medio", "fino"]),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 14, scale: 2 }).notNull(),
  discountPercent: decimal("discountPercent", { precision: 5, scale: 2 }).default("0"),
  totalPrice: decimal("totalPrice", { precision: 14, scale: 2 }).notNull(),
  batchNumber: varchar("batchNumber", { length: 50 }),
});

export type SalesOrderItem = typeof salesOrderItems.$inferSelect;
export type InsertSalesOrderItem = typeof salesOrderItems.$inferInsert;

// ============================================================================
// CUSTOS DE PRODUÇÃO (para Agente de Custos)
// ============================================================================
export const productionCosts = mysqlTable("production_costs", {
  id: int("id").autoincrement().primaryKey(),
  productionOrderId: int("productionOrderId"),
  batchNumber: varchar("batchNumber", { length: 50 }),
  skuId: int("skuId").notNull(),
  productionDate: date("productionDate").notNull(),
  quantityProduced: decimal("quantityProduced", { precision: 10, scale: 2 }).notNull(),
  
  // Custos diretos
  rawMaterialCost: decimal("rawMaterialCost", { precision: 14, scale: 2 }).default("0"),
  packagingCost: decimal("packagingCost", { precision: 14, scale: 2 }).default("0"),
  laborCost: decimal("laborCost", { precision: 14, scale: 2 }).default("0"),
  energyCost: decimal("energyCost", { precision: 14, scale: 2 }).default("0"),
  
  // Custos indiretos
  overheadCost: decimal("overheadCost", { precision: 14, scale: 2 }).default("0"),
  maintenanceCost: decimal("maintenanceCost", { precision: 14, scale: 2 }).default("0"),
  depreciationCost: decimal("depreciationCost", { precision: 14, scale: 2 }).default("0"),
  
  // Totais
  totalDirectCost: decimal("totalDirectCost", { precision: 14, scale: 2 }).default("0"),
  totalIndirectCost: decimal("totalIndirectCost", { precision: 14, scale: 2 }).default("0"),
  totalCost: decimal("totalCost", { precision: 14, scale: 2 }).default("0"),
  unitCost: decimal("unitCost", { precision: 14, scale: 4 }).default("0"),
  
  // Comparação com padrão
  standardUnitCost: decimal("standardUnitCost", { precision: 14, scale: 4 }),
  costVariance: decimal("costVariance", { precision: 14, scale: 4 }),
  costVariancePercent: decimal("costVariancePercent", { precision: 5, scale: 2 }),
  
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type ProductionCost = typeof productionCosts.$inferSelect;
export type InsertProductionCost = typeof productionCosts.$inferInsert;

// ============================================================================
// MOMENTOS MÁGICOS - REGISTRO DE EVENTOS
// ============================================================================
export const magicMoments = mysqlTable("magic_moments", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", [
    "fechamento_turno", "pagamento_produtor", "estoque_critico", "meta_batida",
    "novo_recorde", "economia_identificada", "problema_evitado", "cliente_especial",
    "aniversario_parceria", "fim_semana_tranquilo", "novo_funcionario", "auditoria_simplificada"
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  data: json("data"), // Dados específicos do momento
  targetUserId: int("targetUserId"), // Usuário que deve ver
  targetRole: varchar("targetRole", { length: 50 }), // Ou role específica
  seen: boolean("seen").default(false),
  seenAt: timestamp("seenAt"),
  notificationSent: boolean("notificationSent").default(false),
  notificationSentAt: timestamp("notificationSentAt"),
  notificationChannel: mysqlEnum("notificationChannel", ["app", "email", "whatsapp", "push"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MagicMoment = typeof magicMoments.$inferSelect;
export type InsertMagicMoment = typeof magicMoments.$inferInsert;

// ============================================================================
// CONFIGURAÇÕES DE SEGURANÇA EXPANDIDAS
// ============================================================================
export const securityPolicies = mysqlTable("security_policies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  
  // Política de senhas
  minPasswordLength: int("minPasswordLength").default(8),
  requireUppercase: boolean("requireUppercase").default(true),
  requireLowercase: boolean("requireLowercase").default(true),
  requireNumbers: boolean("requireNumbers").default(true),
  requireSpecialChars: boolean("requireSpecialChars").default(false),
  passwordExpirationDays: int("passwordExpirationDays").default(90),
  passwordHistoryCount: int("passwordHistoryCount").default(5),
  
  // Política de bloqueio
  maxLoginAttempts: int("maxLoginAttempts").default(5),
  lockoutDurationMinutes: int("lockoutDurationMinutes").default(30),
  
  // Política de sessão
  sessionTimeoutMinutes: int("sessionTimeoutMinutes").default(480),
  maxConcurrentSessions: int("maxConcurrentSessions").default(3),
  
  // 2FA
  require2FA: boolean("require2FA").default(false),
  require2FAForRoles: json("require2FAForRoles"), // ['admin', 'financeiro', 'ceo']
  
  active: boolean("active").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SecurityPolicy = typeof securityPolicies.$inferSelect;
export type InsertSecurityPolicy = typeof securityPolicies.$inferInsert;

// ============================================================================
// 2FA - AUTENTICAÇÃO DE DOIS FATORES
// ============================================================================
export const userTwoFactor = mysqlTable("user_two_factor", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  method: mysqlEnum("method", ["totp", "sms", "email"]).default("totp").notNull(),
  secret: varchar("secret", { length: 255 }), // Encrypted TOTP secret
  phone: varchar("phone", { length: 20 }), // Para SMS
  backupCodes: json("backupCodes"), // Array de códigos de backup
  enabled: boolean("enabled").default(false),
  verifiedAt: timestamp("verifiedAt"),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserTwoFactor = typeof userTwoFactor.$inferSelect;
export type InsertUserTwoFactor = typeof userTwoFactor.$inferInsert;

// ============================================================================
// BACKUP E RECUPERAÇÃO
// ============================================================================
export const backupRecords = mysqlTable("backup_records", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["full", "incremental", "differential"]).notNull(),
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  sizeBytes: int("sizeBytes"),
  location: varchar("location", { length: 500 }),
  checksum: varchar("checksum", { length: 64 }),
  retentionDays: int("retentionDays").default(30),
  expiresAt: timestamp("expiresAt"),
  errorMessage: text("errorMessage"),
  restorable: boolean("restorable").default(true),
  lastRestoreTest: timestamp("lastRestoreTest"),
  createdBy: int("createdBy"),
});

export type BackupRecord = typeof backupRecords.$inferSelect;
export type InsertBackupRecord = typeof backupRecords.$inferInsert;


// ============================================================================
// AUTENTICAÇÃO PRÓPRIA - LOGIN COM EMAIL/SENHA
// ============================================================================
export const userCredentials = mysqlTable("user_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  passwordSalt: varchar("passwordSalt", { length: 64 }).notNull(),
  passwordChangedAt: timestamp("passwordChangedAt").defaultNow().notNull(),
  passwordHistory: json("passwordHistory"), // Array of previous hashes
  failedLoginAttempts: int("failedLoginAttempts").default(0),
  lockedUntil: timestamp("lockedUntil"),
  mustChangePassword: boolean("mustChangePassword").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserCredential = typeof userCredentials.$inferSelect;
export type InsertUserCredential = typeof userCredentials.$inferInsert;

// ============================================================================
// SESSÕES DE USUÁRIO - GESTÃO DE SESSÕES ATIVAS
// ============================================================================
export const userActiveSessions = mysqlTable("user_active_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionToken: varchar("sessionToken", { length: 255 }).notNull().unique(),
  refreshToken: varchar("refreshToken", { length: 255 }),
  deviceInfo: text("deviceInfo"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  isValid: boolean("isValid").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserActiveSession = typeof userActiveSessions.$inferSelect;
export type InsertUserActiveSession = typeof userActiveSessions.$inferInsert;

// ============================================================================
// RECUPERAÇÃO DE SENHA
// ============================================================================
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// ============================================================================
// QR CODES - RASTREABILIDADE
// ============================================================================
export const qrCodes = mysqlTable("qr_codes", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["batch", "load", "product", "equipment"]).notNull(),
  entityId: int("entityId").notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  data: json("data"), // Dados adicionais do QR
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  generatedBy: int("generatedBy"),
  printedAt: timestamp("printedAt"),
  printedBy: int("printedBy"),
  scannedCount: int("scannedCount").default(0),
  lastScannedAt: timestamp("lastScannedAt"),
  active: boolean("active").default(true),
});

export type QRCode = typeof qrCodes.$inferSelect;
export type InsertQRCode = typeof qrCodes.$inferInsert;

// ============================================================================
// HISTÓRICO DE PREÇOS DE COMPRA
// ============================================================================
export const priceHistory = mysqlTable("price_history", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["supplier", "producer", "sku"]).notNull(),
  entityId: int("entityId").notNull(),
  skuId: int("skuId"),
  price: decimal("price", { precision: 14, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  effectiveDate: date("effectiveDate").notNull(),
  endDate: date("endDate"),
  source: varchar("source", { length: 100 }), // "purchase_order", "contract", "manual"
  sourceId: int("sourceId"),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type PriceHistoryRecord = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;

// ============================================================================
// RANKING DE PRODUTORES
// ============================================================================
export const producerRankings = mysqlTable("producer_rankings", {
  id: int("id").autoincrement().primaryKey(),
  producerId: int("producerId").notNull(),
  period: varchar("period", { length: 7 }).notNull(), // "2026-01" (YYYY-MM)
  
  // Métricas de volume
  totalLoads: int("totalLoads").default(0),
  totalWeight: decimal("totalWeight", { precision: 14, scale: 2 }).default("0"),
  avgWeightPerLoad: decimal("avgWeightPerLoad", { precision: 10, scale: 2 }).default("0"),
  
  // Métricas de qualidade
  avgQualityScore: decimal("avgQualityScore", { precision: 5, scale: 2 }),
  qualityALoads: int("qualityALoads").default(0),
  qualityBLoads: int("qualityBLoads").default(0),
  qualityCLoads: int("qualityCLoads").default(0),
  rejectedLoads: int("rejectedLoads").default(0),
  
  // Métricas financeiras
  totalPaid: decimal("totalPaid", { precision: 14, scale: 2 }).default("0"),
  avgPricePerKg: decimal("avgPricePerKg", { precision: 10, scale: 4 }).default("0"),
  
  // Rankings
  volumeRank: int("volumeRank"),
  qualityRank: int("qualityRank"),
  overallRank: int("overallRank"),
  overallScore: decimal("overallScore", { precision: 5, scale: 2 }),
  
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
});

export type ProducerRanking = typeof producerRankings.$inferSelect;
export type InsertProducerRanking = typeof producerRankings.$inferInsert;

// ============================================================================
// CUSTOS FIXOS (para Módulo de Custos)
// ============================================================================
export const fixedCosts = mysqlTable("fixed_costs", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", [
    "aluguel", "energia", "agua", "gas", "internet", "telefone",
    "manutencao", "seguro", "impostos", "salarios", "beneficios",
    "depreciacao", "limpeza", "seguranca", "outros"
  ]).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  monthlyValue: decimal("monthlyValue", { precision: 14, scale: 2 }).notNull(),
  effectiveFrom: date("effectiveFrom").notNull(),
  effectiveTo: date("effectiveTo"),
  allocationMethod: mysqlEnum("allocationMethod", ["direto", "proporcional_producao", "proporcional_horas", "fixo"]).default("proporcional_producao"),
  allocationPercentage: decimal("allocationPercentage", { precision: 5, scale: 2 }).default("100"),
  observations: text("observations"),
  active: boolean("active").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type FixedCost = typeof fixedCosts.$inferSelect;
export type InsertFixedCost = typeof fixedCosts.$inferInsert;

// ============================================================================
// NOTIFICAÇÕES PUSH
// ============================================================================
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: varchar("p256dh", { length: 255 }).notNull(),
  auth: varchar("auth", { length: 255 }).notNull(),
  deviceType: varchar("deviceType", { length: 50 }),
  deviceName: varchar("deviceName", { length: 100 }),
  active: boolean("active").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ============================================================================
// PREFERÊNCIAS DE NOTIFICAÇÃO
// ============================================================================
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  
  // Canais
  emailEnabled: boolean("emailEnabled").default(true),
  pushEnabled: boolean("pushEnabled").default(true),
  whatsappEnabled: boolean("whatsappEnabled").default(false),
  
  // Tipos de notificação
  stockAlerts: boolean("stockAlerts").default(true),
  expirationAlerts: boolean("expirationAlerts").default(true),
  paymentAlerts: boolean("paymentAlerts").default(true),
  productionAlerts: boolean("productionAlerts").default(true),
  qualityAlerts: boolean("qualityAlerts").default(true),
  systemAlerts: boolean("systemAlerts").default(true),
  
  // Horários
  quietHoursStart: varchar("quietHoursStart", { length: 5 }), // "22:00"
  quietHoursEnd: varchar("quietHoursEnd", { length: 5 }), // "07:00"
  
  // Frequência de resumos
  dailySummary: boolean("dailySummary").default(true),
  weeklySummary: boolean("weeklySummary").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

// ============================================================================
// LOG DE ALTERAÇÕES DETALHADO
// ============================================================================
export const changeLog = mysqlTable("change_log", {
  id: int("id").autoincrement().primaryKey(),
  tableName: varchar("tableName", { length: 100 }).notNull(),
  recordId: int("recordId").notNull(),
  action: mysqlEnum("action", ["create", "update", "delete"]).notNull(),
  fieldName: varchar("fieldName", { length: 100 }),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  changedAt: timestamp("changedAt").defaultNow().notNull(),
  changedBy: int("changedBy"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
});

export type ChangeLogEntry = typeof changeLog.$inferSelect;
export type InsertChangeLog = typeof changeLog.$inferInsert;


// ============================================================================
// ORÇAMENTO - BUDGETS (Orçamentos Anuais/Mensais)
// ============================================================================
export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["anual", "mensal", "trimestral"]).default("anual").notNull(),
  scenario: mysqlEnum("scenario", ["conservador", "moderado", "otimista", "base_zero"]).default("moderado").notNull(),
  status: mysqlEnum("status", ["rascunho", "em_aprovacao", "aprovado", "revisao", "encerrado"]).default("rascunho").notNull(),
  baseYear: int("baseYear"), // Ano base para importação de histórico
  adjustmentPercent: decimal("adjustmentPercent", { precision: 5, scale: 2 }).default("0"),
  totalRevenue: decimal("totalRevenue", { precision: 18, scale: 2 }).default("0"),
  totalExpenses: decimal("totalExpenses", { precision: 18, scale: 2 }).default("0"),
  totalCapex: decimal("totalCapex", { precision: 18, scale: 2 }).default("0"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

// ============================================================================
// ORÇAMENTO - LINHAS DO ORÇAMENTO (Budget Lines)
// ============================================================================
export const budgetLines = mysqlTable("budget_lines", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budgetId").notNull(),
  costCenter: mysqlEnum("costCenter", ["producao", "comercial", "administrativo", "rh", "manutencao", "qualidade", "logistica", "ti"]).notNull(),
  category: mysqlEnum("category", [
    "receita_vendas", "receita_servicos", "receita_outras",
    "custo_materia_prima", "custo_mao_obra_direta", "custo_energia", "custo_embalagem",
    "despesa_pessoal", "despesa_aluguel", "despesa_utilidades", "despesa_marketing",
    "despesa_manutencao", "despesa_transporte", "despesa_administrativa", "despesa_outras",
    "investimento_equipamento", "investimento_infraestrutura", "investimento_tecnologia", "investimento_outros"
  ]).notNull(),
  isCapex: boolean("isCapex").default(false),
  description: varchar("description", { length: 500 }),
  jan: decimal("jan", { precision: 14, scale: 2 }).default("0"),
  fev: decimal("fev", { precision: 14, scale: 2 }).default("0"),
  mar: decimal("mar", { precision: 14, scale: 2 }).default("0"),
  abr: decimal("abr", { precision: 14, scale: 2 }).default("0"),
  mai: decimal("mai", { precision: 14, scale: 2 }).default("0"),
  jun: decimal("jun", { precision: 14, scale: 2 }).default("0"),
  jul: decimal("jul", { precision: 14, scale: 2 }).default("0"),
  ago: decimal("ago", { precision: 14, scale: 2 }).default("0"),
  set: decimal("set", { precision: 14, scale: 2 }).default("0"),
  out: decimal("out", { precision: 14, scale: 2 }).default("0"),
  nov: decimal("nov", { precision: 14, scale: 2 }).default("0"),
  dez: decimal("dez", { precision: 14, scale: 2 }).default("0"),
  totalYear: decimal("totalYear", { precision: 18, scale: 2 }).default("0"),
  justification: text("justification"), // Justificativa obrigatória para OBZ
  priority: mysqlEnum("priority", ["essencial", "importante", "desejavel"]).default("importante"),
  roiPercent: decimal("roiPercent", { precision: 8, scale: 2 }), // Para CAPEX
  paybackMonths: int("paybackMonths"), // Para CAPEX
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type BudgetLine = typeof budgetLines.$inferSelect;
export type InsertBudgetLine = typeof budgetLines.$inferInsert;

// ============================================================================
// ORÇAMENTO - REALIZADO (Budget Actuals)
// ============================================================================
export const budgetActuals = mysqlTable("budget_actuals", {
  id: int("id").autoincrement().primaryKey(),
  budgetLineId: int("budgetLineId").notNull(),
  month: int("month").notNull(), // 1-12
  year: int("year").notNull(),
  actualValue: decimal("actualValue", { precision: 14, scale: 2 }).notNull(),
  budgetedValue: decimal("budgetedValue", { precision: 14, scale: 2 }).notNull(),
  varianceValue: decimal("varianceValue", { precision: 14, scale: 2 }).notNull(),
  variancePercent: decimal("variancePercent", { precision: 8, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["verde", "amarelo", "vermelho"]).notNull(), // Semáforo
  sourceType: varchar("sourceType", { length: 100 }), // "financial_entry", "purchase", "payroll"
  sourceId: int("sourceId"),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BudgetActual = typeof budgetActuals.$inferSelect;
export type InsertBudgetActual = typeof budgetActuals.$inferInsert;

// ============================================================================
// ORÇAMENTO - CENÁRIOS (Budget Scenarios)
// ============================================================================
export const budgetScenarios = mysqlTable("budget_scenarios", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budgetId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["conservador", "moderado", "otimista"]).notNull(),
  assumptions: json("assumptions"), // Premissas do cenário
  revenueAdjustment: decimal("revenueAdjustment", { precision: 8, scale: 2 }).default("0"),
  expenseAdjustment: decimal("expenseAdjustment", { precision: 8, scale: 2 }).default("0"),
  inflationRate: decimal("inflationRate", { precision: 5, scale: 2 }).default("0"),
  growthRate: decimal("growthRate", { precision: 5, scale: 2 }).default("0"),
  totalRevenue: decimal("totalRevenue", { precision: 18, scale: 2 }).default("0"),
  totalExpenses: decimal("totalExpenses", { precision: 18, scale: 2 }).default("0"),
  netResult: decimal("netResult", { precision: 18, scale: 2 }).default("0"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BudgetScenario = typeof budgetScenarios.$inferSelect;
export type InsertBudgetScenario = typeof budgetScenarios.$inferInsert;

// ============================================================================
// ORÇAMENTO - WORKFLOW DE APROVAÇÃO
// ============================================================================
export const budgetApprovals = mysqlTable("budget_approvals", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budgetId").notNull(),
  step: int("step").notNull(), // 1=Gerente, 2=Diretor, 3=CEO
  role: mysqlEnum("role", ["gerente", "diretor", "ceo"]).notNull(),
  status: mysqlEnum("status", ["pendente", "aprovado", "rejeitado", "delegado"]).default("pendente").notNull(),
  assignedTo: int("assignedTo").notNull(),
  delegatedTo: int("delegatedTo"),
  delegatedReason: text("delegatedReason"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  comments: text("comments"),
  minValue: decimal("minValue", { precision: 18, scale: 2 }), // Alçada mínima
  maxValue: decimal("maxValue", { precision: 18, scale: 2 }), // Alçada máxima
  dueDate: timestamp("dueDate"),
  reminderSent: boolean("reminderSent").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BudgetApproval = typeof budgetApprovals.$inferSelect;
export type InsertBudgetApproval = typeof budgetApprovals.$inferInsert;

// ============================================================================
// ORÇAMENTO - FORECAST ROLLING (Previsão Contínua)
// ============================================================================
export const budgetForecasts = mysqlTable("budget_forecasts", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budgetId").notNull(),
  budgetLineId: int("budgetLineId"),
  forecastMonth: int("forecastMonth").notNull(), // Mês da previsão (1-12)
  forecastYear: int("forecastYear").notNull(),
  targetMonth: int("targetMonth").notNull(), // Mês alvo (1-12)
  targetYear: int("targetYear").notNull(),
  originalBudget: decimal("originalBudget", { precision: 14, scale: 2 }).notNull(),
  previousForecast: decimal("previousForecast", { precision: 14, scale: 2 }),
  currentForecast: decimal("currentForecast", { precision: 14, scale: 2 }).notNull(),
  actualToDate: decimal("actualToDate", { precision: 14, scale: 2 }).default("0"),
  varianceFromBudget: decimal("varianceFromBudget", { precision: 14, scale: 2 }),
  varianceFromPrevious: decimal("varianceFromPrevious", { precision: 14, scale: 2 }),
  confidenceLevel: mysqlEnum("confidenceLevel", ["alta", "media", "baixa"]).default("media"),
  aiSuggestion: text("aiSuggestion"),
  aiConfidence: decimal("aiConfidence", { precision: 5, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type BudgetForecast = typeof budgetForecasts.$inferSelect;
export type InsertBudgetForecast = typeof budgetForecasts.$inferInsert;

// ============================================================================
// ORÇAMENTO - INDICADORES AVANÇADOS
// ============================================================================
export const budgetIndicators = mysqlTable("budget_indicators", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budgetId").notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  burnRate: decimal("burnRate", { precision: 8, scale: 2 }), // Velocidade de consumo (%)
  runRate: decimal("runRate", { precision: 18, scale: 2 }), // Projeção anualizada
  varianceAccumulated: decimal("varianceAccumulated", { precision: 18, scale: 2 }), // Desvio acumulado
  adherenceIndex: decimal("adherenceIndex", { precision: 5, scale: 2 }), // % de linhas dentro do orçado
  linesOnBudget: int("linesOnBudget").default(0),
  linesOverBudget: int("linesOverBudget").default(0),
  linesUnderBudget: int("linesUnderBudget").default(0),
  projectedYearEnd: decimal("projectedYearEnd", { precision: 18, scale: 2 }),
  projectedVariance: decimal("projectedVariance", { precision: 18, scale: 2 }),
  riskLevel: mysqlEnum("riskLevel", ["baixo", "medio", "alto", "critico"]).default("baixo"),
  aiAnalysis: text("aiAnalysis"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BudgetIndicator = typeof budgetIndicators.$inferSelect;
export type InsertBudgetIndicator = typeof budgetIndicators.$inferInsert;

// ============================================================================
// ORÇAMENTO - HISTÓRICO DE REVISÕES
// ============================================================================
export const budgetRevisions = mysqlTable("budget_revisions", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budgetId").notNull(),
  budgetLineId: int("budgetLineId"),
  revisionNumber: int("revisionNumber").notNull(),
  revisionType: mysqlEnum("revisionType", ["criacao", "ajuste", "realocacao", "corte", "suplementacao"]).notNull(),
  previousValue: decimal("previousValue", { precision: 14, scale: 2 }),
  newValue: decimal("newValue", { precision: 14, scale: 2 }),
  changePercent: decimal("changePercent", { precision: 8, scale: 2 }),
  reason: text("reason").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type BudgetRevision = typeof budgetRevisions.$inferSelect;
export type InsertBudgetRevision = typeof budgetRevisions.$inferInsert;

// ============================================================================
// ORÇAMENTO - ALERTAS E INSIGHTS DA IA
// ============================================================================
export const budgetAiInsights = mysqlTable("budget_ai_insights", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budgetId").notNull(),
  budgetLineId: int("budgetLineId"),
  type: mysqlEnum("type", ["alerta", "previsao", "sugestao", "anomalia", "otimizacao"]).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  actionSuggested: text("actionSuggested"),
  potentialSavings: decimal("potentialSavings", { precision: 14, scale: 2 }),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  dataPoints: json("dataPoints"), // Dados que geraram o insight
  status: mysqlEnum("status", ["novo", "visualizado", "em_analise", "resolvido", "ignorado"]).default("novo").notNull(),
  resolvedBy: int("resolvedBy"),
  resolvedAt: timestamp("resolvedAt"),
  resolution: text("resolution"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type BudgetAiInsight = typeof budgetAiInsights.$inferSelect;
export type InsertBudgetAiInsight = typeof budgetAiInsights.$inferInsert;


// ============================================================================
// GESTÃO DE LOTES (Separada do Estoque)
// ============================================================================
export const batches = mysqlTable("batches", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  skuId: int("skuId").notNull(),
  productionOrderId: int("productionOrderId"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  availableQuantity: decimal("availableQuantity", { precision: 10, scale: 2 }).notNull(),
  productionDate: date("productionDate").notNull(),
  expirationDate: date("expirationDate").notNull(),
  status: mysqlEnum("status", ["em_producao", "quarentena", "disponivel", "reservado", "expedido", "vencido", "descartado"]).default("em_producao").notNull(),
  qualityGrade: mysqlEnum("qualityGrade", ["A", "B", "C"]),
  qualityScore: decimal("qualityScore", { precision: 5, scale: 2 }),
  location: varchar("location", { length: 100 }),
  quarantineReason: text("quarantineReason"),
  quarantineStartedAt: timestamp("quarantineStartedAt"),
  quarantineEndedAt: timestamp("quarantineEndedAt"),
  releasedBy: int("releasedBy"),
  releasedAt: timestamp("releasedAt"),
  observations: text("observations"),
  qrCodeUrl: varchar("qrCodeUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type Batch = typeof batches.$inferSelect;
export type InsertBatch = typeof batches.$inferInsert;

// ============================================================================
// MOVIMENTAÇÕES DE LOTES
// ============================================================================
export const batchMovements = mysqlTable("batch_movements", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batchId").notNull(),
  movementType: mysqlEnum("movementType", ["producao", "quarentena", "liberacao", "reserva", "expedicao", "ajuste", "descarte"]).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  previousQuantity: decimal("previousQuantity", { precision: 10, scale: 2 }).notNull(),
  newQuantity: decimal("newQuantity", { precision: 10, scale: 2 }).notNull(),
  previousStatus: varchar("previousStatus", { length: 50 }),
  newStatus: varchar("newStatus", { length: 50 }),
  referenceType: varchar("referenceType", { length: 50 }),
  referenceId: int("referenceId"),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type BatchMovement = typeof batchMovements.$inferSelect;
export type InsertBatchMovement = typeof batchMovements.$inferInsert;

// ============================================================================
// BOM - BILL OF MATERIALS (Receitas)
// ============================================================================
export const bomItems = mysqlTable("bom_items", {
  id: int("id").autoincrement().primaryKey(),
  skuId: int("skuId").notNull(),
  itemId: int("itemId").notNull(),
  itemType: mysqlEnum("itemType", ["materia_prima", "embalagem", "insumo"]).notNull(),
  itemName: varchar("itemName", { length: 255 }).notNull(),
  quantityPerUnit: decimal("quantityPerUnit", { precision: 10, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  wastagePercent: decimal("wastagePercent", { precision: 5, scale: 2 }).default("0"),
  isOptional: boolean("isOptional").default(false),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"),
});

export type BomItem = typeof bomItems.$inferSelect;
export type InsertBomItem = typeof bomItems.$inferInsert;

// ============================================================================
// CENTRAL DE ALERTAS UNIFICADA
// ============================================================================
export const systemAlerts = mysqlTable("system_alerts", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", ["estoque", "producao", "qualidade", "financeiro", "vencimento", "compras", "manutencao", "sistema"]).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  priority: mysqlEnum("priority", ["baixa", "media", "alta", "critica"]).default("media").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  entityType: varchar("entityType", { length: 50 }),
  entityId: int("entityId"),
  entityName: varchar("entityName", { length: 255 }),
  value: decimal("value", { precision: 14, scale: 2 }),
  threshold: decimal("threshold", { precision: 14, scale: 2 }),
  actionUrl: varchar("actionUrl", { length: 255 }),
  status: mysqlEnum("status", ["novo", "visualizado", "em_tratamento", "resolvido", "ignorado"]).default("novo").notNull(),
  readAt: timestamp("readAt"),
  readBy: int("readBy"),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: int("resolvedBy"),
  resolution: text("resolution"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SystemAlert = typeof systemAlerts.$inferSelect;
export type InsertSystemAlert = typeof systemAlerts.$inferInsert;

// NOTA: priceHistory já existe acima na linha 1833

// ============================================================================
// HISTÓRICO DE RELATÓRIOS GERADOS
// ============================================================================
export const reportHistory = mysqlTable("report_history", {
  id: int("id").autoincrement().primaryKey(),
  reportType: mysqlEnum("reportType", ["producao", "financeiro", "estoque", "rastreabilidade", "qualidade", "produtores", "cargas"]).notNull(),
  reportName: varchar("reportName", { length: 255 }).notNull(),
  format: mysqlEnum("format", ["pdf", "excel"]).notNull(),
  periodStart: date("periodStart"),
  periodEnd: date("periodEnd"),
  filters: json("filters"),
  fileUrl: varchar("fileUrl", { length: 500 }),
  fileSize: int("fileSize"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  generatedBy: int("generatedBy"),
  generatedByName: varchar("generatedByName", { length: 255 }),
  downloadCount: int("downloadCount").default(0),
  lastDownloadAt: timestamp("lastDownloadAt"),
});

export type ReportHistory = typeof reportHistory.$inferSelect;
export type InsertReportHistory = typeof reportHistory.$inferInsert;

// ============================================================================
// RASTREABILIDADE - CADEIA DE PRODUÇÃO
// ============================================================================
export const traceabilityChain = mysqlTable("traceability_chain", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batchId").notNull(),
  nodeType: mysqlEnum("nodeType", ["materia_prima", "carga", "producao", "lote", "expedicao"]).notNull(),
  nodeId: int("nodeId").notNull(),
  nodeName: varchar("nodeName", { length: 255 }).notNull(),
  parentNodeId: int("parentNodeId"),
  sequence: int("sequence").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }),
  unit: varchar("unit", { length: 20 }),
  eventDate: timestamp("eventDate").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TraceabilityChain = typeof traceabilityChain.$inferSelect;
export type InsertTraceabilityChain = typeof traceabilityChain.$inferInsert;
