import { getDb } from "../db";
import { batches, batchMovements, skus, productionOrders, traceabilityChain, Batch } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// ============================================================================
// QUERIES DE LOTES
// ============================================================================

export async function getBatches(filters?: {
  status?: string;
  skuId?: number;
  search?: string;
  expiringInDays?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select({
    batch: batches,
    skuCode: skus.code,
    skuDescription: skus.description,
    orderNumber: productionOrders.orderNumber,
  })
  .from(batches)
  .leftJoin(skus, eq(batches.skuId, skus.id))
  .leftJoin(productionOrders, eq(batches.productionOrderId, productionOrders.id))
  .orderBy(desc(batches.createdAt));

  type BatchResult = typeof results[0];
  let filtered = results;
  
  if (filters?.status) {
    filtered = filtered.filter((r: BatchResult) => r.batch.status === filters.status);
  }
  
  if (filters?.skuId) {
    filtered = filtered.filter((r: BatchResult) => r.batch.skuId === filters.skuId);
  }
  
  if (filters?.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter((r: BatchResult) => 
      r.batch.code.toLowerCase().includes(search) ||
      r.skuDescription?.toLowerCase().includes(search)
    );
  }
  
  if (filters?.expiringInDays) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + filters.expiringInDays);
    filtered = filtered.filter((r: BatchResult) => {
      const expDate = new Date(r.batch.expirationDate);
      return expDate <= futureDate && r.batch.status !== 'vencido' && r.batch.status !== 'descartado';
    });
  }
  
  return filtered;
}

export async function getBatchById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select({
    batch: batches,
    skuCode: skus.code,
    skuDescription: skus.description,
    orderNumber: productionOrders.orderNumber,
  })
  .from(batches)
  .leftJoin(skus, eq(batches.skuId, skus.id))
  .leftJoin(productionOrders, eq(batches.productionOrderId, productionOrders.id))
  .where(eq(batches.id, id))
  .limit(1);
  
  return result[0] || null;
}

export async function getBatchByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select({
    batch: batches,
    skuCode: skus.code,
    skuDescription: skus.description,
    orderNumber: productionOrders.orderNumber,
  })
  .from(batches)
  .leftJoin(skus, eq(batches.skuId, skus.id))
  .leftJoin(productionOrders, eq(batches.productionOrderId, productionOrders.id))
  .where(eq(batches.code, code))
  .limit(1);
  
  return result[0] || null;
}

export async function createBatch(data: {
  code: string;
  skuId: number;
  productionOrderId?: number;
  quantity: string;
  productionDate: Date | string;
  expirationDate: Date | string;
  status?: "em_producao" | "quarentena" | "disponivel" | "reservado" | "expedido" | "vencido" | "descartado";
  qualityGrade?: "A" | "B" | "C";
  qualityScore?: string;
  location?: string;
  observations?: string;
  createdBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(batches).values({
    code: data.code,
    skuId: data.skuId,
    productionOrderId: data.productionOrderId,
    quantity: data.quantity,
    availableQuantity: data.quantity,
    productionDate: new Date(data.productionDate),
    expirationDate: new Date(data.expirationDate),
    status: data.status || "em_producao",
    qualityGrade: data.qualityGrade,
    qualityScore: data.qualityScore,
    location: data.location,
    observations: data.observations,
    createdBy: data.createdBy,
  });
  
  const insertId = Number(result[0].insertId);
  
  // Registrar movimentação inicial
  await db.insert(batchMovements).values({
    batchId: insertId,
    movementType: "producao",
    quantity: data.quantity,
    previousQuantity: "0",
    newQuantity: data.quantity,
    previousStatus: null,
    newStatus: data.status || "em_producao",
    reason: "Criação do lote",
    createdBy: data.createdBy,
  });
  
  return insertId;
}

export async function updateBatch(id: number, data: {
  quantity?: string;
  availableQuantity?: string;
  status?: "em_producao" | "quarentena" | "disponivel" | "reservado" | "expedido" | "vencido" | "descartado";
  qualityGrade?: "A" | "B" | "C";
  qualityScore?: string;
  location?: string;
  quarantineReason?: string;
  observations?: string;
  updatedBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(batches)
    .set(data)
    .where(eq(batches.id, id));
}

export async function quarantineBatch(id: number, reason: string, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const batch = await getBatchById(id);
  if (!batch) throw new Error("Lote não encontrado");
  
  const previousStatus = batch.batch.status;
  
  await db.update(batches)
    .set({
      status: "quarentena",
      quarantineReason: reason,
      quarantineStartedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(batches.id, id));
  
  // Registrar movimentação
  await db.insert(batchMovements).values({
    batchId: id,
    movementType: "quarentena",
    quantity: "0",
    previousQuantity: batch.batch.availableQuantity,
    newQuantity: batch.batch.availableQuantity,
    previousStatus,
    newStatus: "quarentena",
    reason,
    createdBy: userId,
  });
}

export async function releaseBatch(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const batch = await getBatchById(id);
  if (!batch) throw new Error("Lote não encontrado");
  
  const previousStatus = batch.batch.status;
  
  await db.update(batches)
    .set({
      status: "disponivel",
      quarantineEndedAt: new Date(),
      releasedBy: userId,
      releasedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(batches.id, id));
  
  // Registrar movimentação
  await db.insert(batchMovements).values({
    batchId: id,
    movementType: "liberacao",
    quantity: "0",
    previousQuantity: batch.batch.availableQuantity,
    newQuantity: batch.batch.availableQuantity,
    previousStatus,
    newStatus: "disponivel",
    reason: "Liberação da quarentena",
    createdBy: userId,
  });
}

export async function getBatchMovements(batchId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(batchMovements)
    .where(eq(batchMovements.batchId, batchId))
    .orderBy(desc(batchMovements.createdAt));
}

export async function getBatchStats() {
  const db = await getDb();
  if (!db) return { total: 0, disponivel: 0, quarentena: 0, emProducao: 0, vencendo: 0, vencidos: 0 };
  
  const allBatches = await db.select().from(batches);
  
  const total = allBatches.length;
  const disponivel = allBatches.filter((b: Batch) => b.status === "disponivel").length;
  const quarentena = allBatches.filter((b: Batch) => b.status === "quarentena").length;
  const emProducao = allBatches.filter((b: Batch) => b.status === "em_producao").length;
  
  // Lotes vencendo nos próximos 30 dias
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const vencendo = allBatches.filter((b: Batch) => {
    const expDate = new Date(b.expirationDate);
    return expDate <= futureDate && b.status !== 'vencido' && b.status !== 'descartado';
  }).length;
  
  // Lotes vencidos
  const vencidos = allBatches.filter((b: Batch) => b.status === "vencido").length;
  
  return {
    total,
    disponivel,
    quarentena,
    emProducao,
    vencendo,
    vencidos,
  };
}

// ============================================================================
// RASTREABILIDADE
// ============================================================================

export async function getTraceabilityChain(batchId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(traceabilityChain)
    .where(eq(traceabilityChain.batchId, batchId))
    .orderBy(traceabilityChain.sequence);
}

export async function addTraceabilityNode(data: {
  batchId: number;
  nodeType: "materia_prima" | "carga" | "producao" | "lote" | "expedicao";
  nodeId: number;
  nodeName: string;
  parentNodeId?: number;
  sequence: number;
  quantity?: string;
  unit?: string;
  eventDate: Date;
  metadata?: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(traceabilityChain).values(data);
  return Number(result[0].insertId);
}

export async function buildTraceabilityTree(batchCode: string) {
  const batch = await getBatchByCode(batchCode);
  if (!batch) return null;
  
  const chain = await getTraceabilityChain(batch.batch.id);
  
  // Construir árvore hierárquica
  const tree: any = {
    id: batch.batch.id,
    code: batch.batch.code,
    type: "lote",
    name: `Lote ${batch.batch.code}`,
    sku: batch.skuDescription,
    quantity: batch.batch.quantity,
    productionDate: batch.batch.productionDate,
    expirationDate: batch.batch.expirationDate,
    status: batch.batch.status,
    children: [] as any[],
  };
  
  // Adicionar nós da cadeia
  for (const node of chain) {
    tree.children.push({
      id: node.nodeId,
      type: node.nodeType,
      name: node.nodeName,
      quantity: node.quantity,
      unit: node.unit,
      date: node.eventDate,
      metadata: node.metadata,
    });
  }
  
  return tree;
}
