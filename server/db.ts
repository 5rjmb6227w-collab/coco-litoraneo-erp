import { eq, desc, and, gte, lte, like, sql, asc, or, not, gt, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  producers, 
  InsertProducer, 
  Producer,
  coconutLoads,
  InsertCoconutLoad,
  CoconutLoad,
  producerPayables,
  InsertProducerPayable,
  ProducerPayable,
  warehouseItems,
  InsertWarehouseItem,
  WarehouseItem,
  warehouseMovements,
  InsertWarehouseMovement,
  WarehouseMovement,
  skus,
  InsertSku,
  Sku,
  finishedGoodsInventory,
  InsertFinishedGoodsInventory,
  FinishedGoodsInventory,
  finishedGoodsMovements,
  InsertFinishedGoodsMovement,
  auditLogs,
  InsertAuditLog,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USER QUERIES
// ============================================================================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "phone", "sector"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'ceo';
      updateSet.role = 'ceo';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// PRODUCER QUERIES
// ============================================================================
export async function getProducers(filters?: { status?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(producers);
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(producers.status, filters.status as "ativo" | "inativo"));
  }
  if (filters?.search) {
    conditions.push(like(producers.name, `%${filters.search}%`));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  return query.orderBy(asc(producers.name));
}

export async function getProducerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(producers).where(eq(producers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProducer(data: InsertProducer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(producers).values(data);
  return result[0].insertId;
}

export async function updateProducer(id: number, data: Partial<InsertProducer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(producers).set(data).where(eq(producers.id, id));
}

// ============================================================================
// COCONUT LOAD QUERIES
// ============================================================================
export async function getCoconutLoads(filters?: { 
  status?: string; 
  producerId?: number; 
  startDate?: string; 
  endDate?: string;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(coconutLoads.status, filters.status as "recebido" | "conferido" | "fechado"));
  }
  if (filters?.producerId) {
    conditions.push(eq(coconutLoads.producerId, filters.producerId));
  }
  if (filters?.startDate) {
    conditions.push(gte(coconutLoads.receivedAt, new Date(filters.startDate)));
  }
  if (filters?.endDate) {
    conditions.push(lte(coconutLoads.receivedAt, new Date(filters.endDate)));
  }
  if (filters?.search) {
    conditions.push(like(coconutLoads.licensePlate, `%${filters.search}%`));
  }

  const query = conditions.length > 0 
    ? db.select().from(coconutLoads).where(and(...conditions))
    : db.select().from(coconutLoads);

  return query.orderBy(desc(coconutLoads.receivedAt));
}

export async function getCoconutLoadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(coconutLoads).where(eq(coconutLoads.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCoconutLoad(data: InsertCoconutLoad) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(coconutLoads).values(data);
  return result[0].insertId;
}

export async function updateCoconutLoad(id: number, data: Partial<InsertCoconutLoad>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(coconutLoads).set(data).where(eq(coconutLoads.id, id));
}

// ============================================================================
// PRODUCER PAYABLE QUERIES
// ============================================================================
export async function getProducerPayables(filters?: { 
  status?: string; 
  producerId?: number; 
  startDate?: string; 
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(producerPayables.status, filters.status as "pendente" | "aprovado" | "programado" | "pago"));
  }
  if (filters?.producerId) {
    conditions.push(eq(producerPayables.producerId, filters.producerId));
  }
  if (filters?.startDate) {
    conditions.push(gte(producerPayables.createdAt, new Date(filters.startDate)));
  }
  if (filters?.endDate) {
    conditions.push(lte(producerPayables.createdAt, new Date(filters.endDate)));
  }

  const query = conditions.length > 0 
    ? db.select().from(producerPayables).where(and(...conditions))
    : db.select().from(producerPayables);

  return query.orderBy(desc(producerPayables.createdAt));
}

export async function getProducerPayableById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(producerPayables).where(eq(producerPayables.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProducerPayable(data: InsertProducerPayable) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(producerPayables).values(data);
  return result[0].insertId;
}

export async function updateProducerPayable(id: number, data: Partial<InsertProducerPayable>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(producerPayables).set(data).where(eq(producerPayables.id, id));
}

// ============================================================================
// WAREHOUSE ITEM QUERIES
// ============================================================================
export async function getWarehouseItems(filters?: { 
  warehouseType?: string; 
  category?: string; 
  status?: string;
  search?: string;
  belowMinimum?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.warehouseType) {
    conditions.push(eq(warehouseItems.warehouseType, filters.warehouseType as "producao" | "geral"));
  }
  if (filters?.category) {
    conditions.push(eq(warehouseItems.category, filters.category));
  }
  if (filters?.status) {
    conditions.push(eq(warehouseItems.status, filters.status as "ativo" | "inativo"));
  }
  if (filters?.search) {
    conditions.push(like(warehouseItems.name, `%${filters.search}%`));
  }
  if (filters?.belowMinimum) {
    conditions.push(sql`${warehouseItems.currentStock} < ${warehouseItems.minimumStock}`);
  }

  const query = conditions.length > 0 
    ? db.select().from(warehouseItems).where(and(...conditions))
    : db.select().from(warehouseItems);

  return query.orderBy(asc(warehouseItems.name));
}

export async function getWarehouseItemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(warehouseItems).where(eq(warehouseItems.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createWarehouseItem(data: InsertWarehouseItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(warehouseItems).values(data);
  return result[0].insertId;
}

export async function updateWarehouseItem(id: number, data: Partial<InsertWarehouseItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(warehouseItems).set(data).where(eq(warehouseItems.id, id));
}

// ============================================================================
// WAREHOUSE MOVEMENT QUERIES
// ============================================================================
export async function getWarehouseMovements(itemId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(warehouseMovements)
    .where(eq(warehouseMovements.warehouseItemId, itemId))
    .orderBy(desc(warehouseMovements.createdAt));
}

export async function createWarehouseMovement(data: Omit<InsertWarehouseMovement, 'previousStock' | 'newStock'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update item stock
  const item = await getWarehouseItemById(data.warehouseItemId);
  if (!item) throw new Error("Item not found");

  const currentStock = Number(item.currentStock);
  let newStock = currentStock;

  if (data.movementType === "entrada") {
    newStock = currentStock + Number(data.quantity);
  } else if (data.movementType === "saida") {
    newStock = currentStock - Number(data.quantity);
  } else {
    newStock = Number(data.quantity); // ajuste direto
  }

  // Insert movement
  const result = await db.insert(warehouseMovements).values({
    warehouseItemId: data.warehouseItemId,
    movementType: data.movementType,
    quantity: data.quantity,
    reason: data.reason,
    observations: data.observations,
    createdBy: data.createdBy,
    previousStock: currentStock.toString(),
    newStock: newStock.toString(),
  });

  // Update item current stock
  await updateWarehouseItem(data.warehouseItemId, { currentStock: newStock.toString() });

  return result[0].insertId;
}

// ============================================================================
// SKU QUERIES
// ============================================================================
export async function getSkus(filters?: { 
  category?: string; 
  variation?: string; 
  status?: string;
  search?: string;
  belowMinimum?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.category) {
    conditions.push(eq(skus.category, filters.category as "seco" | "umido" | "adocado"));
  }
  if (filters?.variation) {
    conditions.push(eq(skus.variation, filters.variation as "flocos" | "medio" | "fino"));
  }
  if (filters?.status) {
    conditions.push(eq(skus.status, filters.status as "ativo" | "inativo"));
  }
  if (filters?.search) {
    conditions.push(like(skus.description, `%${filters.search}%`));
  }
  if (filters?.belowMinimum) {
    conditions.push(sql`${skus.currentStock} < ${skus.minimumStock}`);
  }

  const query = conditions.length > 0 
    ? db.select().from(skus).where(and(...conditions))
    : db.select().from(skus);

  return query.orderBy(asc(skus.code));
}

export async function getSkuById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(skus).where(eq(skus.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSku(data: InsertSku) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(skus).values(data);
  return result[0].insertId;
}

export async function updateSku(id: number, data: Partial<InsertSku>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(skus).set(data).where(eq(skus.id, id));
}

// ============================================================================
// FINISHED GOODS INVENTORY QUERIES
// ============================================================================
export async function getFinishedGoodsInventory(filters?: { 
  skuId?: number; 
  status?: string;
  expiringInDays?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.skuId) {
    conditions.push(eq(finishedGoodsInventory.skuId, filters.skuId));
  }
  if (filters?.status) {
    conditions.push(eq(finishedGoodsInventory.status, filters.status as "disponivel" | "reservado" | "vencido"));
  }
  if (filters?.expiringInDays) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + filters.expiringInDays);
    conditions.push(sql`${finishedGoodsInventory.expirationDate} <= ${futureDate.toISOString().split('T')[0]}`);
  }

  const query = conditions.length > 0 
    ? db.select().from(finishedGoodsInventory).where(and(...conditions))
    : db.select().from(finishedGoodsInventory);

  return query.orderBy(asc(finishedGoodsInventory.expirationDate));
}

export async function createFinishedGoodsInventory(data: InsertFinishedGoodsInventory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(finishedGoodsInventory).values(data);
  
  // Update SKU current stock
  const sku = await getSkuById(data.skuId);
  if (sku) {
    const newStock = Number(sku.currentStock) + Number(data.quantity);
    await updateSku(data.skuId, { currentStock: newStock.toString() });
  }

  return result[0].insertId;
}

export async function updateFinishedGoodsInventory(id: number, data: Partial<InsertFinishedGoodsInventory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(finishedGoodsInventory).set(data).where(eq(finishedGoodsInventory.id, id));
}

// ============================================================================
// FINISHED GOODS MOVEMENT QUERIES
// ============================================================================
export async function createFinishedGoodsMovement(data: Omit<InsertFinishedGoodsMovement, 'previousStock' | 'newStock'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current SKU stock
  const sku = await getSkuById(data.skuId);
  if (!sku) throw new Error("SKU not found");

  const currentStock = Number(sku.currentStock);
  let newStock = currentStock;

  if (data.movementType === "entrada") {
    newStock = currentStock + Number(data.quantity);
  } else if (data.movementType === "saida") {
    newStock = currentStock - Number(data.quantity);
  } else {
    newStock = Number(data.quantity);
  }

  // Insert movement
  const result = await db.insert(finishedGoodsMovements).values({
    skuId: data.skuId,
    inventoryId: data.inventoryId,
    movementType: data.movementType,
    quantity: data.quantity,
    batchNumber: data.batchNumber,
    reason: data.reason,
    referenceType: data.referenceType,
    referenceId: data.referenceId,
    customerDestination: data.customerDestination,
    observations: data.observations,
    createdBy: data.createdBy,
    previousStock: currentStock.toString(),
    newStock: newStock.toString(),
  });

  // Update SKU current stock
  await updateSku(data.skuId, { currentStock: newStock.toString() });

  return result[0].insertId;
}

// ============================================================================
// AUDIT LOG QUERIES
// ============================================================================
export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;

  await db.insert(auditLogs).values(data);
}

export async function getAuditLogs(filters?: {
  userId?: number;
  module?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }
  if (filters?.module) {
    conditions.push(eq(auditLogs.module, filters.module));
  }
  if (filters?.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  if (filters?.startDate) {
    conditions.push(gte(auditLogs.createdAt, new Date(filters.startDate)));
  }
  if (filters?.endDate) {
    conditions.push(lte(auditLogs.createdAt, new Date(filters.endDate)));
  }

  let query = conditions.length > 0 
    ? db.select().from(auditLogs).where(and(...conditions))
    : db.select().from(auditLogs);

  query = query.orderBy(desc(auditLogs.createdAt)) as typeof query;

  if (filters?.limit) {
    query = query.limit(filters.limit) as typeof query;
  }

  return query;
}

// ============================================================================
// SEED DATA FUNCTIONS
// ============================================================================
export async function seedWarehouseItemsProducao() {
  const db = await getDb();
  if (!db) return;

  const items: InsertWarehouseItem[] = [
    { internalCode: "INS001", name: "Açúcar Cristal", unit: "kg", warehouseType: "producao", category: "Adoçantes", minimumStock: "500" },
    { internalCode: "INS002", name: "Propileno Glicol Alimentício", unit: "litro", warehouseType: "producao", category: "Conservantes", minimumStock: "50" },
    { internalCode: "INS003", name: "Maltodextrina", unit: "kg", warehouseType: "producao", category: "Aditivos", minimumStock: "100" },
    { internalCode: "INS004", name: "Fécula de Mandioca", unit: "kg", warehouseType: "producao", category: "Aditivos", minimumStock: "200" },
    { internalCode: "INS005", name: "Sal Refinado", unit: "kg", warehouseType: "producao", category: "Temperos", minimumStock: "50" },
    { internalCode: "INS006", name: "Metabissulfito de Sódio", unit: "kg", warehouseType: "producao", category: "Conservantes", minimumStock: "25" },
    { internalCode: "EMB001", name: "Saco Kraft 5kg", unit: "unidade", warehouseType: "producao", category: "Embalagens", minimumStock: "1000" },
    { internalCode: "EMB002", name: "Saco Kraft 10kg", unit: "unidade", warehouseType: "producao", category: "Embalagens", minimumStock: "500" },
    { internalCode: "EMB003", name: "Saco Plástico 5kg", unit: "unidade", warehouseType: "producao", category: "Embalagens", minimumStock: "1000" },
    { internalCode: "EMB004", name: "Saco Plástico 10kg", unit: "unidade", warehouseType: "producao", category: "Embalagens", minimumStock: "500" },
    { internalCode: "EMB005", name: "Etiqueta Identificação Tipo A", unit: "unidade", warehouseType: "producao", category: "Etiquetas", minimumStock: "2000" },
    { internalCode: "EMB006", name: "Etiqueta Identificação Tipo B", unit: "unidade", warehouseType: "producao", category: "Etiquetas", minimumStock: "2000" },
    { internalCode: "EMB007", name: "Cordão Costura Kraft", unit: "rolo", warehouseType: "producao", category: "Embalagens", minimumStock: "50" },
    { internalCode: "LOG001", name: "Pallet PBR", unit: "unidade", warehouseType: "producao", category: "Logística", minimumStock: "100" },
    { internalCode: "LOG002", name: "Filme Stretch", unit: "rolo", warehouseType: "producao", category: "Logística", minimumStock: "30" },
  ];

  for (const item of items) {
    const existing = await db.select().from(warehouseItems).where(eq(warehouseItems.internalCode, item.internalCode)).limit(1);
    if (existing.length === 0) {
      await db.insert(warehouseItems).values(item);
    }
  }
}

export async function seedWarehouseItemsGerais() {
  const db = await getDb();
  if (!db) return;

  const items: InsertWarehouseItem[] = [
    { internalCode: "LIM001", name: "Detergente Industrial", unit: "litro", warehouseType: "geral", category: "Limpeza", minimumStock: "50" },
    { internalCode: "LIM002", name: "Desinfetante", unit: "litro", warehouseType: "geral", category: "Limpeza", minimumStock: "30" },
    { internalCode: "LIM003", name: "Água Sanitária", unit: "litro", warehouseType: "geral", category: "Limpeza", minimumStock: "50" },
    { internalCode: "CIP001", name: "Soda Cáustica", unit: "kg", warehouseType: "geral", category: "CIP", minimumStock: "100" },
    { internalCode: "CIP002", name: "Ácido Peracético", unit: "litro", warehouseType: "geral", category: "CIP", minimumStock: "50" },
    { internalCode: "EPI001", name: "Luva Nitrílica M", unit: "unidade", warehouseType: "geral", category: "EPI", minimumStock: "100" },
    { internalCode: "EPI002", name: "Luva Nitrílica G", unit: "unidade", warehouseType: "geral", category: "EPI", minimumStock: "100" },
    { internalCode: "EPI003", name: "Máscara Descartável", unit: "unidade", warehouseType: "geral", category: "EPI", minimumStock: "500" },
    { internalCode: "EPI004", name: "Touca Descartável", unit: "unidade", warehouseType: "geral", category: "EPI", minimumStock: "500" },
    { internalCode: "EPI005", name: "Avental PVC", unit: "unidade", warehouseType: "geral", category: "EPI", minimumStock: "20" },
    { internalCode: "EPI006", name: "Bota Branca", unit: "unidade", warehouseType: "geral", category: "EPI", minimumStock: "20" },
    { internalCode: "UNI001", name: "Camiseta Uniforme M", unit: "unidade", warehouseType: "geral", category: "Uniformes", minimumStock: "30" },
    { internalCode: "UNI002", name: "Camiseta Uniforme G", unit: "unidade", warehouseType: "geral", category: "Uniformes", minimumStock: "30" },
    { internalCode: "UNI003", name: "Calça Uniforme M", unit: "unidade", warehouseType: "geral", category: "Uniformes", minimumStock: "30" },
    { internalCode: "MAN001", name: "Óleo Lubrificante", unit: "litro", warehouseType: "geral", category: "Manutenção", minimumStock: "20" },
    { internalCode: "MAN002", name: "Graxa Industrial", unit: "kg", warehouseType: "geral", category: "Manutenção", minimumStock: "10" },
  ];

  for (const item of items) {
    const existing = await db.select().from(warehouseItems).where(eq(warehouseItems.internalCode, item.internalCode)).limit(1);
    if (existing.length === 0) {
      await db.insert(warehouseItems).values(item);
    }
  }
}

export async function seedSkus() {
  const db = await getDb();
  if (!db) return;

  const skuList: InsertSku[] = [
    // Coco Ralado Seco
    { code: "CRS-FL-5", description: "Coco Ralado Seco Flocos 5kg", category: "seco", variation: "flocos", packageWeight: "5", minimumStock: "500", shelfLifeDays: 180 },
    { code: "CRS-MD-5", description: "Coco Ralado Seco Médio 5kg", category: "seco", variation: "medio", packageWeight: "5", minimumStock: "500", shelfLifeDays: 180 },
    { code: "CRS-FN-5", description: "Coco Ralado Seco Fino 5kg", category: "seco", variation: "fino", packageWeight: "5", minimumStock: "500", shelfLifeDays: 180 },
    // Coco Úmido
    { code: "CRU-FL-5", description: "Coco Ralado Úmido Flocos 5kg", category: "umido", variation: "flocos", packageWeight: "5", minimumStock: "300", shelfLifeDays: 30 },
    { code: "CRU-MD-5", description: "Coco Ralado Úmido Médio 5kg", category: "umido", variation: "medio", packageWeight: "5", minimumStock: "300", shelfLifeDays: 30 },
    { code: "CRU-FN-5", description: "Coco Ralado Úmido Fino 5kg", category: "umido", variation: "fino", packageWeight: "5", minimumStock: "300", shelfLifeDays: 30 },
    // Coco Adoçado
    { code: "CRA-FL-5", description: "Coco Ralado Adoçado Flocos 5kg", category: "adocado", variation: "flocos", packageWeight: "5", minimumStock: "400", shelfLifeDays: 90 },
    { code: "CRA-MD-5", description: "Coco Ralado Adoçado Médio 5kg", category: "adocado", variation: "medio", packageWeight: "5", minimumStock: "400", shelfLifeDays: 90 },
    { code: "CRA-FN-5", description: "Coco Ralado Adoçado Fino 5kg", category: "adocado", variation: "fino", packageWeight: "5", minimumStock: "400", shelfLifeDays: 90 },
  ];

  for (const sku of skuList) {
    const existing = await db.select().from(skus).where(eq(skus.code, sku.code)).limit(1);
    if (existing.length === 0) {
      await db.insert(skus).values(sku);
    }
  }
}

export async function runAllSeeds() {
  await seedWarehouseItemsProducao();
  await seedWarehouseItemsGerais();
  await seedSkus();
}


// ============================================================================
// TAREFA 2: QUERIES DOS MÓDULOS DE GESTÃO
// ============================================================================

import {
  productionEntries,
  InsertProductionEntry,
  productionIssues,
  InsertProductionIssue,
  purchaseRequests,
  InsertPurchaseRequest,
  purchaseRequestItems,
  InsertPurchaseRequestItem,
  purchaseQuotations,
  InsertPurchaseQuotation,
  purchaseQuotationItems,
  InsertPurchaseQuotationItem,
  financialEntries,
  InsertFinancialEntry,
  qualityAnalyses,
  InsertQualityAnalysis,
  nonConformities,
  InsertNonConformity,
  correctiveActions,
  InsertCorrectiveAction,
  employees,
  InsertEmployee,
  employeeEvents,
  InsertEmployeeEvent,
  employeeNotes,
  InsertEmployeeNote,
} from "../drizzle/schema";

// ============================================================================
// PRODUCTION ENTRY QUERIES
// ============================================================================
export async function getProductionEntries(filters?: {
  startDate?: string;
  endDate?: string;
  shift?: string;
  skuId?: number;
  variation?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.startDate) {
    conditions.push(gte(productionEntries.productionDate, new Date(filters.startDate)));
  }
  if (filters?.endDate) {
    conditions.push(lte(productionEntries.productionDate, new Date(filters.endDate)));
  }
  if (filters?.shift) {
    conditions.push(eq(productionEntries.shift, filters.shift as "manha" | "tarde" | "noite"));
  }
  if (filters?.skuId) {
    conditions.push(eq(productionEntries.skuId, filters.skuId));
  }
  if (filters?.variation) {
    conditions.push(eq(productionEntries.variation, filters.variation as "flocos" | "medio" | "fino"));
  }

  const query = conditions.length > 0
    ? db.select().from(productionEntries).where(and(...conditions))
    : db.select().from(productionEntries);

  return query.orderBy(desc(productionEntries.productionDate));
}

export async function createProductionEntry(data: InsertProductionEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(productionEntries).values(data);
  return result[0].insertId;
}

// ============================================================================
// PRODUCTION ISSUE QUERIES
// ============================================================================
export async function getProductionIssues(filters?: {
  startDate?: string;
  endDate?: string;
  area?: string;
  status?: string;
  impact?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.startDate) {
    conditions.push(gte(productionIssues.occurredAt, new Date(filters.startDate)));
  }
  if (filters?.endDate) {
    conditions.push(lte(productionIssues.occurredAt, new Date(filters.endDate)));
  }
  if (filters?.area) {
    conditions.push(eq(productionIssues.area, filters.area as any));
  }
  if (filters?.status) {
    conditions.push(eq(productionIssues.status, filters.status as any));
  }
  if (filters?.impact) {
    conditions.push(eq(productionIssues.impact, filters.impact as any));
  }

  const query = conditions.length > 0
    ? db.select().from(productionIssues).where(and(...conditions))
    : db.select().from(productionIssues);

  return query.orderBy(desc(productionIssues.occurredAt));
}

export async function createProductionIssue(data: InsertProductionIssue) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(productionIssues).values(data);
  return result[0].insertId;
}

export async function updateProductionIssue(id: number, data: Partial<InsertProductionIssue>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(productionIssues).set(data).where(eq(productionIssues.id, id));
}

// ============================================================================
// PURCHASE REQUEST QUERIES
// ============================================================================
export async function getPurchaseRequests(filters?: {
  status?: string;
  sector?: string;
  urgency?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(purchaseRequests.status, filters.status as any));
  }
  if (filters?.sector) {
    conditions.push(eq(purchaseRequests.sector, filters.sector as any));
  }
  if (filters?.urgency) {
    conditions.push(eq(purchaseRequests.urgency, filters.urgency as any));
  }
  if (filters?.startDate) {
    conditions.push(gte(purchaseRequests.requestDate, new Date(filters.startDate)));
  }
  if (filters?.endDate) {
    conditions.push(lte(purchaseRequests.requestDate, new Date(filters.endDate)));
  }
  if (filters?.search) {
    conditions.push(like(purchaseRequests.requestNumber, `%${filters.search}%`));
  }

  const query = conditions.length > 0
    ? db.select().from(purchaseRequests).where(and(...conditions))
    : db.select().from(purchaseRequests);

  return query.orderBy(desc(purchaseRequests.requestDate));
}

export async function getPurchaseRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPurchaseRequest(data: InsertPurchaseRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(purchaseRequests).values(data);
  return result[0].insertId;
}

export async function updatePurchaseRequest(id: number, data: Partial<InsertPurchaseRequest>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(purchaseRequests).set(data).where(eq(purchaseRequests.id, id));
}

export async function getNextPurchaseRequestNumber() {
  const db = await getDb();
  if (!db) return "SC-0001";

  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(purchaseRequests);
  const count = result[0]?.count || 0;
  return `SC-${String(count + 1).padStart(4, '0')}`;
}

// ============================================================================
// PURCHASE REQUEST ITEMS QUERIES
// ============================================================================
export async function getPurchaseRequestItems(purchaseRequestId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(purchaseRequestItems).where(eq(purchaseRequestItems.purchaseRequestId, purchaseRequestId));
}

export async function createPurchaseRequestItem(data: InsertPurchaseRequestItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(purchaseRequestItems).values(data);
  return result[0].insertId;
}

// ============================================================================
// PURCHASE QUOTATION QUERIES
// ============================================================================
export async function getPurchaseQuotations(purchaseRequestId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(purchaseQuotations).where(eq(purchaseQuotations.purchaseRequestId, purchaseRequestId));
}

export async function createPurchaseQuotation(data: InsertPurchaseQuotation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(purchaseQuotations).values(data);
  return result[0].insertId;
}

export async function updatePurchaseQuotation(id: number, data: Partial<InsertPurchaseQuotation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(purchaseQuotations).set(data).where(eq(purchaseQuotations.id, id));
}

// ============================================================================
// PURCHASE QUOTATION ITEMS QUERIES
// ============================================================================
export async function getPurchaseQuotationItems(quotationId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(purchaseQuotationItems).where(eq(purchaseQuotationItems.quotationId, quotationId));
}

export async function createPurchaseQuotationItem(data: InsertPurchaseQuotationItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(purchaseQuotationItems).values(data);
  return result[0].insertId;
}

// ============================================================================
// FINANCIAL ENTRY QUERIES
// ============================================================================
export async function getFinancialEntries(filters?: {
  entryType?: string;
  origin?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  referenceType?: string;
  referenceId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.entryType) {
    conditions.push(eq(financialEntries.entryType, filters.entryType as "pagar" | "receber"));
  }
  if (filters?.origin) {
    conditions.push(eq(financialEntries.origin, filters.origin as any));
  }
  if (filters?.status) {
    conditions.push(eq(financialEntries.status, filters.status as any));
  }
  if (filters?.startDate) {
    conditions.push(gte(financialEntries.dueDate, new Date(filters.startDate)));
  }
  if (filters?.endDate) {
    conditions.push(lte(financialEntries.dueDate, new Date(filters.endDate)));
  }
  if (filters?.referenceType) {
    conditions.push(eq(financialEntries.referenceType, filters.referenceType));
  }
  if (filters?.referenceId) {
    conditions.push(eq(financialEntries.referenceId, filters.referenceId));
  }

  const query = conditions.length > 0
    ? db.select().from(financialEntries).where(and(...conditions))
    : db.select().from(financialEntries);

  return query.orderBy(asc(financialEntries.dueDate));
}

export async function createFinancialEntry(data: InsertFinancialEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(financialEntries).values(data);
  return result[0].insertId;
}

export async function updateFinancialEntry(id: number, data: Partial<InsertFinancialEntry>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(financialEntries).set(data).where(eq(financialEntries.id, id));
}

// ============================================================================
// QUALITY ANALYSIS QUERIES
// ============================================================================
export async function getQualityAnalyses(filters?: {
  analysisType?: string;
  result?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.analysisType) {
    conditions.push(eq(qualityAnalyses.analysisType, filters.analysisType as any));
  }
  if (filters?.result) {
    conditions.push(eq(qualityAnalyses.result, filters.result as any));
  }
  if (filters?.startDate) {
    conditions.push(gte(qualityAnalyses.analysisDate, new Date(filters.startDate)));
  }
  if (filters?.endDate) {
    conditions.push(lte(qualityAnalyses.analysisDate, new Date(filters.endDate)));
  }

  const query = conditions.length > 0
    ? db.select().from(qualityAnalyses).where(and(...conditions))
    : db.select().from(qualityAnalyses);

  return query.orderBy(desc(qualityAnalyses.analysisDate));
}

export async function createQualityAnalysis(data: InsertQualityAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(qualityAnalyses).values(data);
  return result[0].insertId;
}

// ============================================================================
// NON CONFORMITY QUERIES
// ============================================================================
export async function getNonConformities(filters?: {
  status?: string;
  origin?: string;
  area?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(nonConformities.status, filters.status as any));
  }
  if (filters?.origin) {
    conditions.push(eq(nonConformities.origin, filters.origin as any));
  }
  if (filters?.area) {
    conditions.push(eq(nonConformities.area, filters.area as any));
  }
  if (filters?.startDate) {
    conditions.push(gte(nonConformities.identificationDate, new Date(filters.startDate)));
  }
  if (filters?.endDate) {
    conditions.push(lte(nonConformities.identificationDate, new Date(filters.endDate)));
  }

  const query = conditions.length > 0
    ? db.select().from(nonConformities).where(and(...conditions))
    : db.select().from(nonConformities);

  return query.orderBy(desc(nonConformities.identificationDate));
}

export async function getNonConformityById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(nonConformities).where(eq(nonConformities.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createNonConformity(data: InsertNonConformity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(nonConformities).values(data);
  return result[0].insertId;
}

export async function updateNonConformity(id: number, data: Partial<InsertNonConformity>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(nonConformities).set(data).where(eq(nonConformities.id, id));
}

export async function getNextNCNumber() {
  const db = await getDb();
  if (!db) return "NC-0001";

  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(nonConformities);
  const count = result[0]?.count || 0;
  return `NC-${String(count + 1).padStart(4, '0')}`;
}

// ============================================================================
// CORRECTIVE ACTION QUERIES
// ============================================================================
export async function getCorrectiveActions(filters?: {
  nonConformityId?: number;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.nonConformityId) {
    conditions.push(eq(correctiveActions.nonConformityId, filters.nonConformityId));
  }
  if (filters?.status) {
    conditions.push(eq(correctiveActions.status, filters.status as any));
  }

  const query = conditions.length > 0
    ? db.select().from(correctiveActions).where(and(...conditions))
    : db.select().from(correctiveActions);

  return query.orderBy(desc(correctiveActions.createdAt));
}

export async function createCorrectiveAction(data: InsertCorrectiveAction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(correctiveActions).values(data);
  return result[0].insertId;
}

export async function updateCorrectiveAction(id: number, data: Partial<InsertCorrectiveAction>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(correctiveActions).set(data).where(eq(correctiveActions.id, id));
}

// ============================================================================
// EMPLOYEE QUERIES
// ============================================================================
export async function getEmployees(filters?: {
  status?: string;
  sector?: string;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(employees.status, filters.status as any));
  }
  if (filters?.sector) {
    conditions.push(eq(employees.sector, filters.sector as any));
  }
  if (filters?.search) {
    conditions.push(like(employees.fullName, `%${filters.search}%`));
  }

  const query = conditions.length > 0
    ? db.select().from(employees).where(and(...conditions))
    : db.select().from(employees);

  return query.orderBy(asc(employees.fullName));
}

export async function getEmployeeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createEmployee(data: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(employees).values(data);
  return result[0].insertId;
}

export async function updateEmployee(id: number, data: Partial<InsertEmployee>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(employees).set(data).where(eq(employees.id, id));
}

// ============================================================================
// EMPLOYEE EVENT QUERIES
// ============================================================================
export async function getEmployeeEvents(filters?: {
  employeeId?: number;
  eventType?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.employeeId) {
    conditions.push(eq(employeeEvents.employeeId, filters.employeeId));
  }
  if (filters?.eventType) {
    conditions.push(eq(employeeEvents.eventType, filters.eventType as any));
  }
  if (filters?.startDate) {
    conditions.push(gte(employeeEvents.eventDate, new Date(filters.startDate)));
  }
  if (filters?.endDate) {
    conditions.push(lte(employeeEvents.eventDate, new Date(filters.endDate)));
  }

  const query = conditions.length > 0
    ? db.select().from(employeeEvents).where(and(...conditions))
    : db.select().from(employeeEvents);

  return query.orderBy(desc(employeeEvents.eventDate));
}

export async function createEmployeeEvent(data: InsertEmployeeEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(employeeEvents).values(data);
  return result[0].insertId;
}

// ============================================================================
// EMPLOYEE NOTE QUERIES
// ============================================================================
export async function getEmployeeNotes(filters?: {
  employeeId?: number;
  noteType?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.employeeId) {
    conditions.push(eq(employeeNotes.employeeId, filters.employeeId));
  }
  if (filters?.noteType) {
    conditions.push(eq(employeeNotes.noteType, filters.noteType as any));
  }

  const query = conditions.length > 0
    ? db.select().from(employeeNotes).where(and(...conditions))
    : db.select().from(employeeNotes);

  return query.orderBy(desc(employeeNotes.noteDate));
}

export async function createEmployeeNote(data: InsertEmployeeNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(employeeNotes).values(data);
  return result[0].insertId;
}

// ============================================================================
// QUALITY STATISTICS
// ============================================================================
export async function getQualityStats(months: number = 6) {
  const db = await getDb();
  if (!db) return { ncsByMonth: [], ncsByOrigin: [], conformityRate: [] };

  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    // Formatar data como string YYYY-MM-DD para compatibilidade com campo DATE do MySQL
    const startDateStr = startDate.toISOString().split('T')[0];

    // NCs por mês - usando sql.raw para evitar problemas de escaping
    const ncsByMonth = await db.execute(
      sql`SELECT DATE_FORMAT(identificationDate, '%Y-%m') as month, COUNT(*) as count 
          FROM non_conformities 
          WHERE identificationDate >= ${startDateStr} 
          GROUP BY DATE_FORMAT(identificationDate, '%Y-%m') 
          ORDER BY month`
    );

    // NCs por origem
    const ncsByOrigin = await db.execute(
      sql`SELECT origin, COUNT(*) as count 
          FROM non_conformities 
          WHERE identificationDate >= ${startDateStr} 
          GROUP BY origin`
    );

    // Taxa de conformidade por mês
    const conformityRate = await db.execute(
      sql`SELECT DATE_FORMAT(analysisDate, '%Y-%m') as month, 
                 COUNT(*) as total, 
                 SUM(CASE WHEN result = 'conforme' THEN 1 ELSE 0 END) as conformes 
          FROM quality_analyses 
          WHERE analysisDate >= ${startDateStr} 
          GROUP BY DATE_FORMAT(analysisDate, '%Y-%m') 
          ORDER BY month`
    );

    // Converter resultados para o formato esperado
    const ncsByMonthResult = Array.isArray(ncsByMonth) ? ncsByMonth : (ncsByMonth as any)[0] || [];
    const ncsByOriginResult = Array.isArray(ncsByOrigin) ? ncsByOrigin : (ncsByOrigin as any)[0] || [];
    const conformityRateResult = Array.isArray(conformityRate) ? conformityRate : (conformityRate as any)[0] || [];

    return { 
      ncsByMonth: ncsByMonthResult as { month: string; count: number }[], 
      ncsByOrigin: ncsByOriginResult as { origin: string; count: number }[], 
      conformityRate: conformityRateResult as { month: string; total: number; conformes: number }[] 
    };
  } catch (error) {
    console.error('Error in getQualityStats:', error);
    return { ncsByMonth: [], ncsByOrigin: [], conformityRate: [] };
  }
}

// ============================================================================
// ABSENTEEISM REPORT
// ============================================================================
export async function getAbsenteeismReport(filters?: {
  month?: number;
  year?: number;
  sector?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const month = filters?.month || now.getMonth() + 1;
  const year = filters?.year || now.getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const conditions = [
    gte(employeeEvents.eventDate, startDate),
    lte(employeeEvents.eventDate, endDate),
  ];

  const events = await db.select().from(employeeEvents).where(and(...conditions));
  const employeeList = await getEmployees({ status: "ativo", sector: filters?.sector });

  return employeeList.map(emp => {
    const empEvents = events.filter(e => e.employeeId === emp.id);
    return {
      employeeId: emp.id,
      employeeName: emp.fullName,
      sector: emp.sector,
      faltasJustificadas: empEvents.filter(e => e.eventType === "falta_justificada").length,
      faltasInjustificadas: empEvents.filter(e => e.eventType === "falta_injustificada").length,
      atrasos: empEvents.filter(e => e.eventType === "atraso").length,
      horasExtras: empEvents
        .filter(e => e.eventType === "hora_extra")
        .reduce((sum, e) => sum + Number(e.hoursQuantity || 0), 0),
      totalAusencias: empEvents.filter(e => 
        ["falta_justificada", "falta_injustificada", "atraso", "saida_antecipada"].includes(e.eventType)
      ).length,
    };
  });
}

// ============================================================================
// CASH FLOW PROJECTION
// ============================================================================
export async function getCashFlowProjection(days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const today = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  // Buscar todas as entradas financeiras no período
  const entries = await db.select()
    .from(financialEntries)
    .where(and(
      gte(financialEntries.dueDate, today),
      lte(financialEntries.dueDate, endDate),
      sql`${financialEntries.status} NOT IN ('pago', 'recebido', 'cancelado')`
    ))
    .orderBy(asc(financialEntries.dueDate));

  // Agrupar por semana
  const weeks: { weekStart: Date; weekEnd: Date; entradas: number; saidas: number }[] = [];
  
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() + (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekEntries = entries.filter(e => {
      const dueDate = new Date(e.dueDate);
      return dueDate >= weekStart && dueDate <= weekEnd;
    });

    weeks.push({
      weekStart,
      weekEnd,
      entradas: weekEntries
        .filter(e => e.entryType === "receber")
        .reduce((sum, e) => sum + Number(e.value), 0),
      saidas: weekEntries
        .filter(e => e.entryType === "pagar")
        .reduce((sum, e) => sum + Number(e.value), 0),
    });
  }

  return weeks;
}


// ============================================================================
// TAREFA 3: RBAC E SEGURANÇA
// ============================================================================

import { 
  userSessions, 
  InsertUserSession, 
  UserSession,
  loginAttempts,
  InsertLoginAttempt,
  securityAlerts,
  InsertSecurityAlert,
  systemSettings,
  InsertSystemSetting,
} from "../drizzle/schema";

// ============================================================================
// USER SESSIONS QUERIES
// ============================================================================
export async function createUserSession(session: Omit<InsertUserSession, "id">): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(userSessions).values(session);
  return result[0].insertId;
}

export async function getActiveSessions(filters?: { userId?: number }): Promise<UserSession[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(userSessions.isActive, true)];
  
  if (filters?.userId) {
    conditions.push(eq(userSessions.userId, filters.userId));
  }
  
  const query = db.select().from(userSessions).where(and(...conditions)).orderBy(desc(userSessions.loginAt));
  
  return query;
}

export async function updateSessionActivity(sessionId: string, currentModule?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(userSessions)
    .set({ 
      lastActivityAt: new Date(),
      currentModule: currentModule || undefined,
    })
    .where(eq(userSessions.sessionId, sessionId));
}

export async function endSession(sessionId: string, reason: "manual" | "timeout" | "forcado" | "expirado"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const session = await db.select().from(userSessions).where(eq(userSessions.sessionId, sessionId)).limit(1);
  if (session.length === 0) return;
  
  const loginAt = session[0].loginAt;
  const now = new Date();
  const durationMinutes = Math.floor((now.getTime() - loginAt.getTime()) / 60000);
  
  await db.update(userSessions)
    .set({ 
      isActive: false,
      logoutAt: now,
      logoutReason: reason,
      durationMinutes,
    })
    .where(eq(userSessions.sessionId, sessionId));
}

export async function getSessionBySessionId(sessionId: string): Promise<UserSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(userSessions).where(eq(userSessions.sessionId, sessionId)).limit(1);
  return result[0];
}

// ============================================================================
// LOGIN ATTEMPTS QUERIES
// ============================================================================
export async function createLoginAttempt(attempt: Omit<InsertLoginAttempt, "id">): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(loginAttempts).values(attempt);
  return result[0].insertId;
}

export async function getRecentFailedAttempts(email: string, minutes: number = 30): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const since = new Date(Date.now() - minutes * 60 * 1000);
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(loginAttempts)
    .where(and(
      eq(loginAttempts.email, email),
      eq(loginAttempts.success, false),
      gte(loginAttempts.createdAt, since)
    ));
  
  return result[0]?.count || 0;
}

// ============================================================================
// SECURITY ALERTS QUERIES
// ============================================================================
export async function createSecurityAlert(alert: Omit<InsertSecurityAlert, "id">): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(securityAlerts).values(alert);
  return result[0].insertId;
}

export async function getSecurityAlerts(filters?: { 
  isRead?: boolean; 
  priority?: string;
  limit?: number;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (filters?.isRead !== undefined) {
    conditions.push(eq(securityAlerts.isRead, filters.isRead));
  }
  if (filters?.priority) {
    conditions.push(eq(securityAlerts.priority, filters.priority as any));
  }
  
  let query = conditions.length > 0 
    ? db.select().from(securityAlerts).where(and(...conditions))
    : db.select().from(securityAlerts);
  
  query = query.orderBy(desc(securityAlerts.createdAt)) as typeof query;
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as typeof query;
  }
  
  return query;
}

export async function markAlertAsRead(alertId: number, readBy: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(securityAlerts)
    .set({ 
      isRead: true,
      readAt: new Date(),
      readBy,
    })
    .where(eq(securityAlerts.id, alertId));
}

export async function getUnreadAlertsCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(securityAlerts)
    .where(eq(securityAlerts.isRead, false));
  
  return result[0]?.count || 0;
}

// ============================================================================
// SYSTEM SETTINGS QUERIES
// ============================================================================
export async function getSystemSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, key)).limit(1);
  return result[0]?.settingValue || null;
}

export async function getSystemSettings(category?: string): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const query = category
    ? db.select().from(systemSettings).where(eq(systemSettings.category, category)).orderBy(systemSettings.category, systemSettings.settingKey)
    : db.select().from(systemSettings).orderBy(systemSettings.category, systemSettings.settingKey);
  
  return query;
}

export async function upsertSystemSetting(setting: Omit<InsertSystemSetting, "id">): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(systemSettings)
    .values(setting)
    .onDuplicateKeyUpdate({
      set: {
        settingValue: setting.settingValue,
        updatedAt: new Date(),
        updatedBy: setting.updatedBy,
      },
    });
}

// ============================================================================
// USER MANAGEMENT QUERIES (Admin only)
// ============================================================================
export async function getAllUsers(filters?: {
  status?: string;
  role?: string;
  search?: string;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(users.status, filters.status as any));
  }
  if (filters?.role) {
    conditions.push(eq(users.role, filters.role as any));
  }
  if (filters?.search) {
    conditions.push(or(
      like(users.name, `%${filters.search}%`),
      like(users.email, `%${filters.search}%`)
    ));
  }
  
  const query = conditions.length > 0
    ? db.select().from(users).where(and(...conditions)).orderBy(users.name)
    : db.select().from(users).orderBy(users.name);
  
  return query;
}

export async function getUserById(id: number): Promise<any | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUser(id: number, data: Partial<InsertUser>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function blockUser(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(users).set({ status: "bloqueado" }).where(eq(users.id, id));
}

export async function unblockUser(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(users).set({ status: "ativo" }).where(eq(users.id, id));
}

// ============================================================================
// ONLINE USERS QUERIES
// ============================================================================
export async function getOnlineUsers(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Consider users online if they had activity in the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const sessions = await db.select({
    sessionId: userSessions.sessionId,
    userId: userSessions.userId,
    loginAt: userSessions.loginAt,
    lastActivityAt: userSessions.lastActivityAt,
    currentModule: userSessions.currentModule,
    ipAddress: userSessions.ipAddress,
    userAgent: userSessions.userAgent,
  })
    .from(userSessions)
    .where(and(
      eq(userSessions.isActive, true),
      gte(userSessions.lastActivityAt, fiveMinutesAgo)
    ))
    .orderBy(desc(userSessions.lastActivityAt));
  
  // Get user details for each session
  const result = await Promise.all(sessions.map(async (session) => {
    const user = await getUserById(session.userId);
    return {
      ...session,
      userName: user?.name,
      userEmail: user?.email,
      userRole: user?.role,
    };
  }));
  
  return result;
}

// ============================================================================
// DASHBOARD QUERIES
// ============================================================================

export async function getDashboardStats(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return null;

  const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
  const end = endDate || new Date();

  // Produção total - usar quantityProduced e converter datas para string ISO
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  
  const productionResult = await db.select({
    total: sql<number>`COALESCE(SUM(${productionEntries.quantityProduced}), 0)`,
  }).from(productionEntries)
    .where(sql`${productionEntries.productionDate} >= ${startStr} AND ${productionEntries.productionDate} <= ${endStr}`);

  // Cargas recebidas
  const loadsResult = await db.select({
    count: sql<number>`COUNT(*)`,
    totalWeight: sql<number>`COALESCE(SUM(${coconutLoads}.netWeight), 0)`,
  }).from(coconutLoads)
    .where(and(
      gte(coconutLoads.receivedAt, start),
      lte(coconutLoads.receivedAt, end)
    ));

  // A pagar produtores - usar totalValue em vez de totalAmount
  const payablesResult = await db.select({
    total: sql<number>`COALESCE(SUM(${producerPayables.totalValue}), 0)`,
    pending: sql<number>`COALESCE(SUM(CASE WHEN ${producerPayables.status} IN ('pendente', 'aprovado', 'programado') THEN ${producerPayables.totalValue} ELSE 0 END), 0)`,
    overdue: sql<number>`COALESCE(SUM(CASE WHEN ${producerPayables.status} != 'pago' AND ${producerPayables.dueDate} < CURRENT_DATE THEN ${producerPayables.totalValue} ELSE 0 END), 0)`,
  }).from(producerPayables);

  // Compras pendentes
  const purchasesResult = await db.select({
    count: sql<number>`COUNT(*)`,
  }).from(purchaseRequests)
    .where(inArray(purchaseRequests.status, ['solicitado', 'em_cotacao', 'aguardando_aprovacao']));

  // NCs abertas
  const ncsResult = await db.select({
    count: sql<number>`COUNT(*)`,
  }).from(nonConformities)
    .where(inArray(nonConformities.status, ['aberta', 'em_analise', 'acao_corretiva']));

  // Produtores ativos
  const producersResult = await db.select({
    count: sql<number>`COUNT(*)`,
  }).from(producers)
    .where(eq(producers.status, 'ativo'));

  return {
    production: {
      total: Number(productionResult[0]?.total || 0),
    },
    loads: {
      count: Number(loadsResult[0]?.count || 0),
      totalWeight: Number(loadsResult[0]?.totalWeight || 0),
    },
    payables: {
      total: Number(payablesResult[0]?.total || 0),
      pending: Number(payablesResult[0]?.pending || 0),
      overdue: Number(payablesResult[0]?.overdue || 0),
    },
    purchases: {
      pending: Number(purchasesResult[0]?.count || 0),
    },
    ncs: {
      open: Number(ncsResult[0]?.count || 0),
    },
    producers: {
      active: Number(producersResult[0]?.count || 0),
    },
  };
}

export async function getProductionBySkuVariation(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
  const end = endDate || new Date();
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  const result = await db.select({
    sku: productionEntries.skuId,
    variation: productionEntries.variation,
    total: sql<number>`SUM(${productionEntries.quantityProduced})`,
  }).from(productionEntries)
    .where(sql`${productionEntries.productionDate} >= ${startStr} AND ${productionEntries.productionDate} <= ${endStr}`)
    .groupBy(productionEntries.skuId, productionEntries.variation);

  return result;
}

export async function getProductionByShift(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
  const end = endDate || new Date();
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  const result = await db.select({
    shift: productionEntries.shift,
    total: sql<number>`SUM(${productionEntries.quantityProduced})`,
  }).from(productionEntries)
    .where(sql`${productionEntries.productionDate} >= ${startStr} AND ${productionEntries.productionDate} <= ${endStr}`)
    .groupBy(productionEntries.shift);

  return result;
}

export async function getTopProducersByVolume(startDate?: Date, endDate?: Date, limit = 10) {
  const db = await getDb();
  if (!db) return [];

  const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
  const end = endDate || new Date();

  const result = await db.select({
    producerId: coconutLoads.producerId,
    producerName: producers.name,
    totalWeight: sql<number>`SUM(${coconutLoads}.netWeight)`,
  }).from(coconutLoads)
    .leftJoin(producers, eq(coconutLoads.producerId, producers.id))
    .where(and(
      gte(coconutLoads.receivedAt, start),
      lte(coconutLoads.receivedAt, end)
    ))
    .groupBy(coconutLoads.producerId, producers.name)
    .orderBy(desc(sql`SUM(${coconutLoads}.netWeight)`))
    .limit(limit);

  return result;
}

export async function getLoadsEvolution(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
  const end = endDate || new Date();
  const startStr = start.toISOString().slice(0, 19).replace('T', ' ');
  const endStr = end.toISOString().slice(0, 19).replace('T', ' ');

  // Usar SQL raw para evitar problemas com interpolação de colunas no GROUP BY
  const result = await db.execute(
    sql`SELECT DATE(receivedAt) as date, SUM(netWeight) as totalWeight, COUNT(*) as count 
        FROM coconut_loads 
        WHERE receivedAt >= ${startStr} AND receivedAt <= ${endStr}
        GROUP BY DATE(receivedAt) 
        ORDER BY DATE(receivedAt)`
  );

  // Converter resultado para o formato esperado
  const rows = (result[0] as unknown) as any[];
  return rows.map(row => ({
    date: row.date,
    totalWeight: Number(row.totalWeight) || 0,
    count: Number(row.count) || 0,
  }));
}

export async function getPaymentsByStatus() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    status: producerPayables.status,
    total: sql<number>`SUM(${producerPayables.totalValue})`,
    count: sql<number>`COUNT(*)`,
  }).from(producerPayables)
    .groupBy(producerPayables.status);

  return result;
}

export async function getUpcomingPayments(days = 7) {
  const db = await getDb();
  if (!db) return [];

  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  const result = await db.select({
    id: producerPayables.id,
    producerId: producerPayables.producerId,
    producerName: producers.name,
    totalAmount: producerPayables.totalValue,
    dueDate: producerPayables.dueDate,
    status: producerPayables.status,
  }).from(producerPayables)
    .leftJoin(producers, eq(producerPayables.producerId, producers.id))
    .where(and(
      gte(producerPayables.dueDate, today),
      lte(producerPayables.dueDate, futureDate),
      not(eq(producerPayables.status, 'pago'))
    ))
    .orderBy(producerPayables.dueDate)
    .limit(10);

  return result;
}

export async function getStockAlerts() {
  const db = await getDb();
  if (!db) return { warehouse: [], finishedGoods: [] };

  const warehouseAlerts = await db.select()
    .from(warehouseItems)
    .where(sql`${warehouseItems}.currentStock < ${warehouseItems}.minimumStock`);

  const skuAlerts = await db.select()
    .from(skus)
    .where(sql`${skus}.currentStock < ${skus}.minimumStock`);

  return { warehouse: warehouseAlerts, finishedGoods: skuAlerts };
}

export async function getExpiringProducts(days = 30) {
  const db = await getDb();
  if (!db) return [];

  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  const result = await db.select({
    id: finishedGoodsInventory.id,
    skuId: finishedGoodsInventory.skuId,
    skuCode: skus.code,
    skuDescription: skus.description,
    batch: finishedGoodsInventory.batchNumber,
    expirationDate: finishedGoodsInventory.expirationDate,
    currentStock: finishedGoodsInventory.quantity,
  }).from(finishedGoodsInventory)
    .leftJoin(skus, eq(finishedGoodsInventory.skuId, skus.id))
    .where(and(
      lte(finishedGoodsInventory.expirationDate, futureDate),
      sql`${finishedGoodsInventory}.quantity > 0`
    ))
    .orderBy(finishedGoodsInventory.expirationDate);

  return result;
}

export async function getNcsByMonth(months = 6) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const result = await db.select({
    month: sql<string>`DATE_FORMAT(${nonConformities}.createdAt, '%Y-%m')`,
    count: sql<number>`COUNT(*)`,
  }).from(nonConformities)
    .where(gte(nonConformities.createdAt, startDate))
    .groupBy(sql`DATE_FORMAT(${nonConformities}.createdAt, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(${nonConformities}.createdAt, '%Y-%m')`);

  return result;
}

export async function getConformityIndex(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return { conforming: 0, total: 0, percentage: 0 };

  const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
  const end = endDate || new Date();

  const result = await db.select({
    total: sql<number>`COUNT(*)`,
    conforming: sql<number>`SUM(CASE WHEN ${qualityAnalyses}.result = 'conforme' THEN 1 ELSE 0 END)`,
  }).from(qualityAnalyses)
    .where(and(
      gte(qualityAnalyses.analysisDate, start),
      lte(qualityAnalyses.analysisDate, end)
    ));

  const total = Number(result[0]?.total || 0);
  const conforming = Number(result[0]?.conforming || 0);
  const percentage = total > 0 ? (conforming / total) * 100 : 100;

  return { conforming, total, percentage };
}

export async function globalSearch(query: string) {
  const db = await getDb();
  if (!db || !query || query.length < 3) return {};

  const searchTerm = `%${query}%`;

  const producersResults = await db.select({
    id: producers.id,
    name: producers.name,
    cpfCnpj: producers.cpfCnpj,
  }).from(producers)
    .where(or(
      like(producers.name, searchTerm),
      like(producers.cpfCnpj, searchTerm)
    ))
    .limit(5);

  const loadsResults = await db.select({
    id: coconutLoads.id,
    licensePlate: coconutLoads.licensePlate,
    observations: coconutLoads.observations,
  }).from(coconutLoads)
    .where(or(
      like(coconutLoads.licensePlate, searchTerm),
      like(coconutLoads.observations, searchTerm)
    ))
    .limit(5);

  const employeesResults = await db.select({
    id: employees.id,
    name: employees.fullName,
    position: employees.position,
  }).from(employees)
    .where(like(employees.fullName, searchTerm))
    .limit(5);

  const warehouseResults = await db.select({
    id: warehouseItems.id,
    name: warehouseItems.name,
    category: warehouseItems.category,
  }).from(warehouseItems)
    .where(like(warehouseItems.name, searchTerm))
    .limit(5);

  const skusResults = await db.select({
    id: skus.id,
    code: skus.code,
    description: skus.description,
  }).from(skus)
    .where(or(
      like(skus.code, searchTerm),
      like(skus.description, searchTerm)
    ))
    .limit(5);

  const ncsResults = await db.select({
    id: nonConformities.id,
    ncNumber: nonConformities.ncNumber,
    description: nonConformities.description,
  }).from(nonConformities)
    .where(or(
      like(nonConformities.ncNumber, searchTerm),
      like(nonConformities.description, searchTerm)
    ))
    .limit(5);

  return {
    producers: producersResults,
    loads: loadsResults,
    employees: employeesResults,
    warehouse: warehouseResults,
    skus: skusResults,
    ncs: ncsResults,
  };
}


// ============================================================================
// OEE (OVERALL EQUIPMENT EFFECTIVENESS) QUERIES
// ============================================================================

import { productionOrders, productionStages, productionIssues as prodIssues } from "../drizzle/schema";

/**
 * Calcula o OEE (Overall Equipment Effectiveness) baseado nos apontamentos de produção
 * OEE = Disponibilidade × Performance × Qualidade
 * 
 * - Disponibilidade = Tempo Produtivo / Tempo Planejado
 * - Performance = Produção Real / Produção Teórica
 * - Qualidade = Produção Boa / Produção Total
 */
export async function getOEEMetrics(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return null;

  const start = startDate || new Date(new Date().setDate(new Date().getDate() - 7));
  const end = endDate || new Date();
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  // Tempo planejado por turno (em minutos): 8 horas = 480 minutos
  const PLANNED_TIME_PER_SHIFT = 480;
  
  // Produção teórica por turno (kg) - baseado na capacidade nominal
  const THEORETICAL_PRODUCTION_PER_SHIFT = 2000;

  // Buscar apontamentos de produção no período
  const productionData = await db.select({
    date: productionEntries.productionDate,
    shift: productionEntries.shift,
    quantityProduced: productionEntries.quantityProduced,
    losses: productionEntries.losses,
  }).from(productionEntries)
    .where(sql`${productionEntries.productionDate} >= ${startStr} AND ${productionEntries.productionDate} <= ${endStr}`);

  // Buscar problemas/paradas no período
  const issuesData = await db.select({
    downtimeMinutes: prodIssues.downtimeMinutes,
    shift: prodIssues.shift,
  }).from(prodIssues)
    .where(and(
      gte(prodIssues.occurredAt, start),
      lte(prodIssues.occurredAt, end)
    ));

  // Calcular métricas
  const totalShifts = productionData.length || 1;
  const totalPlannedTime = totalShifts * PLANNED_TIME_PER_SHIFT;
  const totalDowntime = issuesData.reduce((sum, issue) => sum + (issue.downtimeMinutes || 0), 0);
  const totalProductiveTime = totalPlannedTime - totalDowntime;

  const totalProduced = productionData.reduce((sum, entry) => sum + Number(entry.quantityProduced || 0), 0);
  const totalLosses = productionData.reduce((sum, entry) => sum + Number(entry.losses || 0), 0);
  const totalTheoreticalProduction = totalShifts * THEORETICAL_PRODUCTION_PER_SHIFT;

  // Disponibilidade (%)
  const availability = totalPlannedTime > 0 
    ? (totalProductiveTime / totalPlannedTime) * 100 
    : 0;

  // Performance (%)
  const performance = totalTheoreticalProduction > 0 
    ? ((totalProduced + totalLosses) / totalTheoreticalProduction) * 100 
    : 0;

  // Qualidade (%)
  const quality = (totalProduced + totalLosses) > 0 
    ? (totalProduced / (totalProduced + totalLosses)) * 100 
    : 100;

  // OEE (%)
  const oee = (availability * performance * quality) / 10000;

  return {
    oee: Math.min(oee, 100),
    availability: Math.min(availability, 100),
    performance: Math.min(performance, 100),
    quality: Math.min(quality, 100),
    totalProduced,
    totalLosses,
    totalDowntimeMinutes: totalDowntime,
    totalProductiveMinutes: totalProductiveTime,
    totalPlannedMinutes: totalPlannedTime,
    shiftsCount: totalShifts,
  };
}

/**
 * Retorna o histórico de OEE por dia para gráfico de linha
 */
export async function getOEEHistory(days: number = 7) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = new Date().toISOString().split('T')[0];

  // Constantes de capacidade
  const PLANNED_TIME_PER_SHIFT = 480;
  const THEORETICAL_PRODUCTION_PER_SHIFT = 2000;

  // Buscar produção agrupada por dia
  const productionByDay = await db.select({
    date: productionEntries.productionDate,
    totalProduced: sql<number>`SUM(${productionEntries.quantityProduced})`,
    totalLosses: sql<number>`SUM(COALESCE(${productionEntries.losses}, 0))`,
    shiftsCount: sql<number>`COUNT(DISTINCT ${productionEntries.shift})`,
  }).from(productionEntries)
    .where(sql`${productionEntries.productionDate} >= ${startStr} AND ${productionEntries.productionDate} <= ${endStr}`)
    .groupBy(productionEntries.productionDate)
    .orderBy(productionEntries.productionDate);

  // Buscar paradas agrupadas por dia
  const downtimeByDay = await db.select({
    date: sql<string>`DATE(${prodIssues.occurredAt}) as date_col`,
    totalDowntime: sql<number>`SUM(COALESCE(${prodIssues.downtimeMinutes}, 0))`,
  }).from(prodIssues)
    .where(sql`DATE(${prodIssues.occurredAt}) >= ${startStr} AND DATE(${prodIssues.occurredAt}) <= ${endStr}`)
    .groupBy(sql`date_col`);

  // Criar mapa de downtime por data
  const downtimeMap = new Map<string, number>();
  downtimeByDay.forEach(d => {
    downtimeMap.set(String(d.date), Number(d.totalDowntime) || 0);
  });

  // Calcular OEE por dia
  return productionByDay.map(day => {
    const dateStr = String(day.date);
    const shiftsCount = Number(day.shiftsCount) || 1;
    const totalPlannedTime = shiftsCount * PLANNED_TIME_PER_SHIFT;
    const totalDowntime = downtimeMap.get(dateStr) || 0;
    const totalProductiveTime = totalPlannedTime - totalDowntime;
    const totalProduced = Number(day.totalProduced) || 0;
    const totalLosses = Number(day.totalLosses) || 0;
    const totalTheoreticalProduction = shiftsCount * THEORETICAL_PRODUCTION_PER_SHIFT;

    const availability = totalPlannedTime > 0 ? (totalProductiveTime / totalPlannedTime) * 100 : 0;
    const performance = totalTheoreticalProduction > 0 ? ((totalProduced + totalLosses) / totalTheoreticalProduction) * 100 : 0;
    const quality = (totalProduced + totalLosses) > 0 ? (totalProduced / (totalProduced + totalLosses)) * 100 : 100;
    const oee = (availability * performance * quality) / 10000;

    return {
      date: dateStr,
      oee: Math.min(oee, 100),
      availability: Math.min(availability, 100),
      performance: Math.min(performance, 100),
      quality: Math.min(quality, 100),
    };
  });
}

/**
 * Retorna alertas dinâmicos do sistema para os dashboards
 */
export async function getDashboardAlerts(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  const alerts: Array<{
    id: number;
    type: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    timestamp: Date;
    module: string;
  }> = [];

  // 1. Alertas de estoque baixo
  const lowStockItems = await db.select({
    id: warehouseItems.id,
    name: warehouseItems.name,
    currentStock: warehouseItems.currentStock,
    minimumStock: warehouseItems.minimumStock,
    unit: warehouseItems.unit,
  }).from(warehouseItems)
    .where(sql`${warehouseItems.currentStock} < ${warehouseItems.minimumStock} AND ${warehouseItems.status} = 'ativo'`)
    .limit(5);

  lowStockItems.forEach(item => {
    const percentage = Number(item.minimumStock) > 0 
      ? (Number(item.currentStock) / Number(item.minimumStock)) * 100 
      : 0;
    alerts.push({
      id: item.id,
      type: 'stock_low',
      severity: percentage < 25 ? 'critical' : 'warning',
      title: 'Estoque Baixo',
      message: `${item.name} com ${Number(item.currentStock).toFixed(0)} ${item.unit} (mín: ${Number(item.minimumStock).toFixed(0)})`,
      timestamp: new Date(),
      module: 'almoxarifado',
    });
  });

  // 2. Alertas de produtos próximos do vencimento
  const expiringProducts = await db.select({
    id: finishedGoodsInventory.id,
    skuId: finishedGoodsInventory.skuId,
    batchNumber: finishedGoodsInventory.batchNumber,
    expirationDate: finishedGoodsInventory.expirationDate,
    quantity: finishedGoodsInventory.quantity,
  }).from(finishedGoodsInventory)
    .where(and(
      sql`${finishedGoodsInventory.expirationDate} <= DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY)`,
      sql`${finishedGoodsInventory.expirationDate} >= CURRENT_DATE`,
      eq(finishedGoodsInventory.status, 'disponivel')
    ))
    .limit(3);

  expiringProducts.forEach(product => {
    const daysUntilExpiry = Math.ceil((new Date(product.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    alerts.push({
      id: product.id,
      type: 'expiring_product',
      severity: daysUntilExpiry <= 3 ? 'critical' : 'warning',
      title: 'Produto Próximo do Vencimento',
      message: `Lote ${product.batchNumber} vence em ${daysUntilExpiry} dia(s)`,
      timestamp: new Date(),
      module: 'estoque',
    });
  });

  // 3. Alertas de pagamentos atrasados
  const overduePayments = await db.select({
    id: producerPayables.id,
    producerId: producerPayables.producerId,
    totalValue: producerPayables.totalValue,
    dueDate: producerPayables.dueDate,
  }).from(producerPayables)
    .where(and(
      sql`${producerPayables.dueDate} < CURRENT_DATE`,
      sql`${producerPayables.status} != 'pago'`
    ))
    .limit(3);

  overduePayments.forEach(payment => {
    const daysOverdue = Math.ceil((new Date().getTime() - new Date(payment.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
    alerts.push({
      id: payment.id,
      type: 'payment_overdue',
      severity: daysOverdue > 7 ? 'critical' : 'warning',
      title: 'Pagamento Atrasado',
      message: `R$ ${Number(payment.totalValue).toFixed(2)} atrasado há ${daysOverdue} dia(s)`,
      timestamp: new Date(),
      module: 'financeiro',
    });
  });

  // 4. Alertas de problemas de produção abertos
  const openIssues = await db.select({
    id: prodIssues.id,
    description: prodIssues.description,
    impact: prodIssues.impact,
    occurredAt: prodIssues.occurredAt,
    area: prodIssues.area,
  }).from(prodIssues)
    .where(eq(prodIssues.status, 'aberto'))
    .orderBy(desc(prodIssues.occurredAt))
    .limit(3);

  openIssues.forEach(issue => {
    alerts.push({
      id: issue.id,
      type: 'production_issue',
      severity: issue.impact === 'parada_total' || issue.impact === 'alto' ? 'critical' : 'warning',
      title: 'Problema de Produção',
      message: issue.description.substring(0, 80) + (issue.description.length > 80 ? '...' : ''),
      timestamp: issue.occurredAt,
      module: 'producao',
    });
  });

  // 5. Alertas de compras pendentes
  const pendingPurchases = await db.select({
    id: purchaseRequests.id,
    requestNumber: purchaseRequests.requestNumber,
    urgency: purchaseRequests.urgency,
    requestDate: purchaseRequests.requestDate,
  }).from(purchaseRequests)
    .where(eq(purchaseRequests.status, 'solicitado'))
    .orderBy(desc(purchaseRequests.requestDate))
    .limit(2);

  pendingPurchases.forEach(purchase => {
    alerts.push({
      id: purchase.id,
      type: 'purchase_pending',
      severity: purchase.urgency === 'critica' || purchase.urgency === 'alta' ? 'critical' : 'info',
      title: 'Compra Pendente',
      message: `Solicitação ${purchase.requestNumber} aguardando aprovação`,
      timestamp: purchase.requestDate,
      module: 'compras',
    });
  });

  // Ordenar por timestamp (mais recentes primeiro) e limitar
  return alerts
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Retorna métricas de produção do turno atual para o Dashboard Operador
 */
export async function getCurrentShiftMetrics() {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const currentHour = now.getHours();
  
  // Determinar turno atual (Manhã: 6-14, Tarde: 14-22, Noite: 22-6)
  let currentShift: 'manha' | 'tarde' | 'noite';
  let shiftStart: Date;
  let shiftEnd: Date;
  
  if (currentHour >= 6 && currentHour < 14) {
    currentShift = 'manha';
    shiftStart = new Date(now.setHours(6, 0, 0, 0));
    shiftEnd = new Date(now.setHours(14, 0, 0, 0));
  } else if (currentHour >= 14 && currentHour < 22) {
    currentShift = 'tarde';
    shiftStart = new Date(now.setHours(14, 0, 0, 0));
    shiftEnd = new Date(now.setHours(22, 0, 0, 0));
  } else {
    currentShift = 'noite';
    if (currentHour >= 22) {
      shiftStart = new Date(now.setHours(22, 0, 0, 0));
      shiftEnd = new Date(new Date(now).setDate(now.getDate() + 1));
      shiftEnd.setHours(6, 0, 0, 0);
    } else {
      shiftStart = new Date(new Date(now).setDate(now.getDate() - 1));
      shiftStart.setHours(22, 0, 0, 0);
      shiftEnd = new Date(now.setHours(6, 0, 0, 0));
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Buscar produção do turno atual
  const shiftProduction = await db.select({
    totalProduced: sql<number>`COALESCE(SUM(${productionEntries.quantityProduced}), 0)`,
    totalLosses: sql<number>`COALESCE(SUM(${productionEntries.losses}), 0)`,
    entriesCount: sql<number>`COUNT(*)`,
  }).from(productionEntries)
    .where(and(
      sql`${productionEntries.productionDate} = ${todayStr}`,
      eq(productionEntries.shift, currentShift)
    ));

  // Calcular progresso do turno
  const nowTime = new Date();
  const shiftDurationMs = shiftEnd.getTime() - shiftStart.getTime();
  const elapsedMs = nowTime.getTime() - shiftStart.getTime();
  const shiftProgress = Math.min(Math.max((elapsedMs / shiftDurationMs) * 100, 0), 100);
  const remainingMinutes = Math.max(0, Math.floor((shiftEnd.getTime() - nowTime.getTime()) / (1000 * 60)));

  return {
    currentShift,
    shiftStart,
    shiftEnd,
    shiftProgress,
    remainingMinutes,
    totalProduced: Number(shiftProduction[0]?.totalProduced || 0),
    totalLosses: Number(shiftProduction[0]?.totalLosses || 0),
    entriesCount: Number(shiftProduction[0]?.entriesCount || 0),
  };
}
