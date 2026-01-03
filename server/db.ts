import { eq, desc, and, gte, lte, like, sql, asc } from "drizzle-orm";
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
