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
