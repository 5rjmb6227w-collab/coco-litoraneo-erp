import { getDb } from "../db";
import { systemAlerts, warehouseItems, finishedGoodsInventory, skus, producerPayables, productionIssues, purchaseRequests } from "../../drizzle/schema";
import { eq, desc, and, lte, gte, or, sql, not } from "drizzle-orm";

// ============================================================================
// QUERIES DE ALERTAS
// ============================================================================

export async function getAlerts(filters?: {
  category?: string;
  status?: string;
  priority?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select()
    .from(systemAlerts)
    .orderBy(desc(systemAlerts.createdAt));
  
  type AlertResult = typeof results[0];
  let filtered = results;
  
  if (filters?.category) {
    filtered = filtered.filter((a: AlertResult) => a.category === filters.category);
  }
  
  if (filters?.status) {
    filtered = filtered.filter((a: AlertResult) => a.status === filters.status);
  }
  
  if (filters?.priority) {
    filtered = filtered.filter((a: AlertResult) => a.priority === filters.priority);
  }
  
  return filtered;
}

export async function getAlertById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(systemAlerts)
    .where(eq(systemAlerts.id, id))
    .limit(1);
  
  return result[0] || null;
}

export async function createAlert(data: {
  category: "estoque" | "producao" | "qualidade" | "financeiro" | "vencimento" | "compras" | "manutencao" | "sistema";
  type: string;
  priority: "baixa" | "media" | "alta" | "critica";
  title: string;
  description: string;
  entityType?: string;
  entityId?: number;
  entityName?: string;
  value?: string;
  threshold?: string;
  actionUrl?: string;
  expiresAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(systemAlerts).values(data);
  return Number(result[0].insertId);
}

export async function markAlertAsRead(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(systemAlerts)
    .set({
      status: "visualizado",
      readAt: new Date(),
      readBy: userId,
    })
    .where(eq(systemAlerts.id, id));
}

export async function resolveAlert(id: number, resolution: string, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(systemAlerts)
    .set({
      status: "resolvido",
      resolvedAt: new Date(),
      resolvedBy: userId,
      resolution,
    })
    .where(eq(systemAlerts.id, id));
}

export async function ignoreAlert(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(systemAlerts)
    .set({
      status: "ignorado",
      resolvedAt: new Date(),
      resolvedBy: userId,
    })
    .where(eq(systemAlerts.id, id));
}

export async function getAlertStats() {
  const db = await getDb();
  if (!db) return { total: 0, naoLidos: 0, criticos: 0, resolvidos: 0 };
  
  const allAlerts = await db.select().from(systemAlerts);
  
  type AlertType = typeof allAlerts[0];
  
  const total = allAlerts.length;
  const naoLidos = allAlerts.filter((a: AlertType) => a.status === "novo").length;
  const criticos = allAlerts.filter((a: AlertType) => a.priority === "critica" && a.status !== "resolvido").length;
  const resolvidos = allAlerts.filter((a: AlertType) => a.status === "resolvido").length;
  
  return { total, naoLidos, criticos, resolvidos };
}

// ============================================================================
// GERAÇÃO AUTOMÁTICA DE ALERTAS
// ============================================================================

export async function generateStockAlerts() {
  const db = await getDb();
  if (!db) return [];
  
  const alerts: any[] = [];
  
  // Verificar estoque baixo no almoxarifado
  const lowStockItems = await db.select()
    .from(warehouseItems)
    .where(sql`${warehouseItems.currentStock} <= ${warehouseItems.minimumStock}`);
  
  for (const item of lowStockItems) {
    // Verificar se já existe alerta ativo para este item
    const existingAlert = await db.select()
      .from(systemAlerts)
      .where(and(
        eq(systemAlerts.entityType, "warehouse_item"),
        eq(systemAlerts.entityId, item.id),
        eq(systemAlerts.type, "estoque_baixo"),
        not(eq(systemAlerts.status, "resolvido"))
      ))
      .limit(1);
    
    if (existingAlert.length === 0) {
      const alertId = await createAlert({
        category: "estoque",
        type: "estoque_baixo",
        priority: Number(item.currentStock) === 0 ? "critica" : "alta",
        title: `Estoque baixo: ${item.name}`,
        description: `O item "${item.name}" está com estoque abaixo do mínimo. Atual: ${item.currentStock} ${item.unit}, Mínimo: ${item.minimumStock} ${item.unit}`,
        entityType: "warehouse_item",
        entityId: item.id,
        entityName: item.name,
        value: item.currentStock,
        threshold: item.minimumStock,
        actionUrl: `/almoxarifado/${item.warehouseType}`,
      });
      alerts.push({ id: alertId, type: "estoque_baixo", item: item.name });
    }
  }
  
  return alerts;
}

export async function generateExpirationAlerts() {
  const db = await getDb();
  if (!db) return [];
  
  const alerts: any[] = [];
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  // Verificar produtos próximos do vencimento
  const expiringProducts = await db.select({
    inventory: finishedGoodsInventory,
    skuCode: skus.code,
    skuDescription: skus.description,
  })
  .from(finishedGoodsInventory)
  .leftJoin(skus, eq(finishedGoodsInventory.skuId, skus.id))
  .where(and(
    sql`${finishedGoodsInventory.expirationDate} <= ${thirtyDaysFromNow.toISOString().split('T')[0]}`,
    sql`${finishedGoodsInventory.expirationDate} >= ${today.toISOString().split('T')[0]}`,
    not(eq(finishedGoodsInventory.status, "vencido"))
  ));
  
  for (const item of expiringProducts) {
    const existingAlert = await db.select()
      .from(systemAlerts)
      .where(and(
        eq(systemAlerts.entityType, "finished_goods"),
        eq(systemAlerts.entityId, item.inventory.id),
        eq(systemAlerts.type, "vencimento_proximo"),
        not(eq(systemAlerts.status, "resolvido"))
      ))
      .limit(1);
    
    if (existingAlert.length === 0) {
      const daysUntilExpiration = Math.ceil((new Date(item.inventory.expirationDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      const alertId = await createAlert({
        category: "vencimento",
        type: "vencimento_proximo",
        priority: daysUntilExpiration <= 7 ? "critica" : daysUntilExpiration <= 15 ? "alta" : "media",
        title: `Produto vencendo: ${item.skuDescription}`,
        description: `O lote ${item.inventory.batchNumber} de "${item.skuDescription}" vence em ${daysUntilExpiration} dias (${item.inventory.expirationDate}). Quantidade: ${item.inventory.quantity}`,
        entityType: "finished_goods",
        entityId: item.inventory.id,
        entityName: item.skuDescription || "",
        actionUrl: `/estoque/produto-acabado`,
      });
      alerts.push({ id: alertId, type: "vencimento_proximo", item: item.skuDescription });
    }
  }
  
  return alerts;
}

export async function generatePaymentAlerts() {
  const db = await getDb();
  if (!db) return [];
  
  const alerts: any[] = [];
  const today = new Date().toISOString().split('T')[0];
  
  // Verificar pagamentos atrasados
  const overduePayments = await db.select()
    .from(producerPayables)
    .where(and(
      sql`${producerPayables.dueDate} <= ${today}`,
      not(eq(producerPayables.status, "pago"))
    ));
  
  for (const payment of overduePayments) {
    const existingAlert = await db.select()
      .from(systemAlerts)
      .where(and(
        eq(systemAlerts.entityType, "producer_payable"),
        eq(systemAlerts.entityId, payment.id),
        eq(systemAlerts.type, "pagamento_atrasado"),
        not(eq(systemAlerts.status, "resolvido"))
      ))
      .limit(1);
    
    if (existingAlert.length === 0) {
      const alertId = await createAlert({
        category: "financeiro",
        type: "pagamento_atrasado",
        priority: "alta",
        title: `Pagamento atrasado`,
        description: `Pagamento de R$ ${payment.totalValue} está atrasado. Vencimento: ${payment.dueDate}`,
        entityType: "producer_payable",
        entityId: payment.id,
        value: payment.totalValue,
        actionUrl: `/financeiro/pagamentos`,
      });
      alerts.push({ id: alertId, type: "pagamento_atrasado", value: payment.totalValue });
    }
  }
  
  return alerts;
}

export async function generateProductionAlerts() {
  const db = await getDb();
  if (!db) return [];
  
  const alerts: any[] = [];
  
  // Verificar problemas de produção abertos
  const openIssues = await db.select()
    .from(productionIssues)
    .where(eq(productionIssues.status, "aberto"));
  
  for (const issue of openIssues) {
    const existingAlert = await db.select()
      .from(systemAlerts)
      .where(and(
        eq(systemAlerts.entityType, "production_issue"),
        eq(systemAlerts.entityId, issue.id),
        eq(systemAlerts.type, "problema_producao"),
        not(eq(systemAlerts.status, "resolvido"))
      ))
      .limit(1);
    
    if (existingAlert.length === 0) {
      const alertId = await createAlert({
        category: "producao",
        type: "problema_producao",
        priority: issue.impact === "parada_total" ? "critica" : issue.impact === "alto" ? "alta" : "media",
        title: `Problema na produção: ${issue.area}`,
        description: issue.description.substring(0, 200),
        entityType: "production_issue",
        entityId: issue.id,
        actionUrl: `/producao/problemas`,
      });
      alerts.push({ id: alertId, type: "problema_producao", area: issue.area });
    }
  }
  
  return alerts;
}

export async function generatePurchaseAlerts() {
  const db = await getDb();
  if (!db) return [];
  
  const alerts: any[] = [];
  
  // Verificar compras pendentes de aprovação
  const pendingPurchases = await db.select()
    .from(purchaseRequests)
    .where(eq(purchaseRequests.status, "aguardando_aprovacao"));
  
  for (const purchase of pendingPurchases) {
    const existingAlert = await db.select()
      .from(systemAlerts)
      .where(and(
        eq(systemAlerts.entityType, "purchase_request"),
        eq(systemAlerts.entityId, purchase.id),
        eq(systemAlerts.type, "compra_pendente"),
        not(eq(systemAlerts.status, "resolvido"))
      ))
      .limit(1);
    
    if (existingAlert.length === 0) {
      const alertId = await createAlert({
        category: "compras",
        type: "compra_pendente",
        priority: purchase.urgency === "critica" ? "critica" : purchase.urgency === "alta" ? "alta" : "media",
        title: `Compra pendente de aprovação: ${purchase.requestNumber}`,
        description: `Solicitação de compra ${purchase.requestNumber} aguardando aprovação. Urgência: ${purchase.urgency}`,
        entityType: "purchase_request",
        entityId: purchase.id,
        entityName: purchase.requestNumber,
        actionUrl: `/compras/solicitacoes/${purchase.id}`,
      });
      alerts.push({ id: alertId, type: "compra_pendente", number: purchase.requestNumber });
    }
  }
  
  return alerts;
}

// Função para gerar todos os alertas
export async function generateAllAlerts() {
  const stockAlerts = await generateStockAlerts();
  const expirationAlerts = await generateExpirationAlerts();
  const paymentAlerts = await generatePaymentAlerts();
  const productionAlerts = await generateProductionAlerts();
  const purchaseAlerts = await generatePurchaseAlerts();
  
  return {
    stock: stockAlerts,
    expiration: expirationAlerts,
    payment: paymentAlerts,
    production: productionAlerts,
    purchase: purchaseAlerts,
    total: stockAlerts.length + expirationAlerts.length + paymentAlerts.length + productionAlerts.length + purchaseAlerts.length,
  };
}
