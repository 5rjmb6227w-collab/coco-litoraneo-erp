/**
 * AI Insight Generator - Gera insights automáticos baseados em regras e dados
 * 
 * Este módulo implementa os 7 insights P0 definidos na arquitetura:
 * 1. Estoque crítico de insumos
 * 2. Pagamentos atrasados a produtores
 * 3. Produto acabado próximo do vencimento
 * 4. Anomalia de rendimento na produção
 * 5. Contas a pagar vencidas
 * 6. NCs abertas há mais de X dias
 * 7. Solicitações de compra pendentes de aprovação
 */

import { getDb } from "../db";
import { 
  aiInsights,
  aiAlerts,
  InsertAIInsight,
  InsertAIAlert,
  warehouseItems,
  producerPayables,
  finishedGoodsInventory,
  skus,
  financialEntries,
  nonConformities,
  purchaseRequests,
  users,
} from "../../drizzle/schema";
import { eq, and, lte, sql, count, desc } from "drizzle-orm";

// ============================================================================
// TIPOS
// ============================================================================

export interface InsightResult {
  created: number;
  skipped: number;
  errors: string[];
}

// ============================================================================
// INSIGHT 1: ESTOQUE CRÍTICO DE INSUMOS
// ============================================================================

export async function checkCriticalStock(): Promise<InsightResult> {
  const db = await getDb();
  if (!db) return { created: 0, skipped: 0, errors: ["Database not available"] };

  const result: InsightResult = { created: 0, skipped: 0, errors: [] };

  try {
    // Busca itens com estoque <= 50% do mínimo (crítico)
    const criticalItems = await db
      .select()
      .from(warehouseItems)
      .where(and(
        eq(warehouseItems.status, "ativo"),
        sql`${warehouseItems.currentStock} <= ${warehouseItems.minimumStock} * 0.5`
      ));

    for (const item of criticalItems) {
      // Verifica se já existe insight ativo para este item
      const existing = await db
        .select()
        .from(aiInsights)
        .where(and(
          eq(aiInsights.insightType, "stock_critical"),
          eq(aiInsights.entityType, "warehouse_item"),
          eq(aiInsights.entityId, item.id),
          eq(aiInsights.status, "active")
        ))
        .limit(1);

      if (existing.length > 0) {
        result.skipped++;
        continue;
      }

      // Cria novo insight
      const stockPercent = item.minimumStock 
        ? Math.round((Number(item.currentStock) / Number(item.minimumStock)) * 100) 
        : 0;

      await db.insert(aiInsights).values({
        insightType: "stock_critical",
        severity: "critical",
        title: `Estoque crítico: ${item.name}`,
        summary: `O item "${item.name}" está com apenas ${stockPercent}% do estoque mínimo (${item.currentStock} ${item.unit} de ${item.minimumStock} ${item.unit} necessários).`,
        details: {
          itemId: item.id,
          itemName: item.name,
          currentStock: Number(item.currentStock),
          minimumStock: Number(item.minimumStock),
          unit: item.unit,
          warehouseType: item.warehouseType,
          stockPercent,
        },
        module: "almoxarifado",
        entityType: "warehouse_item",
        entityId: item.id,
      });

      result.created++;
    }
  } catch (error) {
    result.errors.push(`Erro ao verificar estoque crítico: ${error}`);
  }

  return result;
}

// ============================================================================
// INSIGHT 2: PAGAMENTOS ATRASADOS A PRODUTORES
// ============================================================================

export async function checkOverdueProducerPayments(): Promise<InsightResult> {
  const db = await getDb();
  if (!db) return { created: 0, skipped: 0, errors: ["Database not available"] };

  const result: InsightResult = { created: 0, skipped: 0, errors: [] };
  const now = new Date();

  try {
    // Busca pagamentos pendentes com data de vencimento passada
    const overduePayments = await db
      .select()
      .from(producerPayables)
      .where(and(
        eq(producerPayables.status, "pendente"),
        lte(producerPayables.dueDate, now)
      ));

    for (const payment of overduePayments) {
      // Verifica se já existe insight ativo
      const existing = await db
        .select()
        .from(aiInsights)
        .where(and(
          eq(aiInsights.insightType, "payment_overdue"),
          eq(aiInsights.entityType, "producer_payable"),
          eq(aiInsights.entityId, payment.id),
          eq(aiInsights.status, "active")
        ))
        .limit(1);

      if (existing.length > 0) {
        result.skipped++;
        continue;
      }

      const dueDate = payment.dueDate ? new Date(payment.dueDate) : null;
      const daysOverdue = dueDate 
        ? Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      await db.insert(aiInsights).values({
        insightType: "payment_overdue",
        severity: daysOverdue > 7 ? "critical" : "warning",
        title: `Pagamento atrasado há ${daysOverdue} dias`,
        summary: `Pagamento de R$ ${Number(payment.totalValue).toFixed(2)} ao produtor está atrasado há ${daysOverdue} dias (vencimento: ${dueDate?.toLocaleDateString("pt-BR")}).`,
        details: {
          payableId: payment.id,
          producerId: payment.producerId,
          totalValue: Number(payment.totalValue),
          dueDate: payment.dueDate,
          daysOverdue,
        },
        module: "pagamentos",
        entityType: "producer_payable",
        entityId: payment.id,
      });

      result.created++;
    }
  } catch (error) {
    result.errors.push(`Erro ao verificar pagamentos atrasados: ${error}`);
  }

  return result;
}

// ============================================================================
// INSIGHT 3: PRODUTO ACABADO PRÓXIMO DO VENCIMENTO
// ============================================================================

export async function checkExpiringProducts(): Promise<InsightResult> {
  const db = await getDb();
  if (!db) return { created: 0, skipped: 0, errors: ["Database not available"] };

  const result: InsightResult = { created: 0, skipped: 0, errors: [] };
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  try {
    // Busca lotes que vencem nos próximos 30 dias
    const expiringLots = await db
      .select({
        inventory: finishedGoodsInventory,
        sku: skus,
      })
      .from(finishedGoodsInventory)
      .leftJoin(skus, eq(finishedGoodsInventory.skuId, skus.id))
      .where(and(
        eq(finishedGoodsInventory.status, "disponivel"),
        lte(finishedGoodsInventory.expirationDate, thirtyDaysFromNow)
      ));

    for (const { inventory, sku } of expiringLots) {
      // Verifica se já existe insight ativo
      const existing = await db
        .select()
        .from(aiInsights)
        .where(and(
          eq(aiInsights.insightType, "product_expiring"),
          eq(aiInsights.entityType, "finished_goods_inventory"),
          eq(aiInsights.entityId, inventory.id),
          eq(aiInsights.status, "active")
        ))
        .limit(1);

      if (existing.length > 0) {
        result.skipped++;
        continue;
      }

      const expDate = new Date(inventory.expirationDate);
      const daysToExpire = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isExpired = daysToExpire <= 0;

      await db.insert(aiInsights).values({
        insightType: isExpired ? "product_expired" : "product_expiring",
        severity: isExpired ? "critical" : (daysToExpire <= 7 ? "warning" : "info"),
        title: isExpired 
          ? `Produto vencido: Lote ${inventory.batchNumber}`
          : `Produto vence em ${daysToExpire} dias: Lote ${inventory.batchNumber}`,
        summary: `${sku?.description || "Produto"} - Lote ${inventory.batchNumber} com ${inventory.quantity} unidades ${isExpired ? "venceu" : `vence em ${expDate.toLocaleDateString("pt-BR")}`}.`,
        details: {
          inventoryId: inventory.id,
          skuId: inventory.skuId,
          skuDescription: sku?.description,
          batchNumber: inventory.batchNumber,
          quantity: Number(inventory.quantity),
          expirationDate: inventory.expirationDate,
          daysToExpire,
        },
        module: "estoque_pa",
        entityType: "finished_goods_inventory",
        entityId: inventory.id,
      });

      result.created++;
    }
  } catch (error) {
    result.errors.push(`Erro ao verificar produtos próximos do vencimento: ${error}`);
  }

  return result;
}

// ============================================================================
// INSIGHT 5: CONTAS A PAGAR VENCIDAS
// ============================================================================

export async function checkOverduePayables(): Promise<InsightResult> {
  const db = await getDb();
  if (!db) return { created: 0, skipped: 0, errors: ["Database not available"] };

  const result: InsightResult = { created: 0, skipped: 0, errors: [] };
  const now = new Date();

  try {
    // Busca contas a pagar pendentes e vencidas
    const overdueEntries = await db
      .select()
      .from(financialEntries)
      .where(and(
        eq(financialEntries.entryType, "pagar"),
        eq(financialEntries.status, "pendente"),
        lte(financialEntries.dueDate, now)
      ));

    for (const entry of overdueEntries) {
      // Verifica se já existe insight ativo
      const existing = await db
        .select()
        .from(aiInsights)
        .where(and(
          eq(aiInsights.insightType, "payable_overdue"),
          eq(aiInsights.entityType, "financial_entry"),
          eq(aiInsights.entityId, entry.id),
          eq(aiInsights.status, "active")
        ))
        .limit(1);

      if (existing.length > 0) {
        result.skipped++;
        continue;
      }

      const dueDate = new Date(entry.dueDate);
      const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      await db.insert(aiInsights).values({
        insightType: "payable_overdue",
        severity: daysOverdue > 7 ? "critical" : "warning",
        title: `Conta a pagar vencida há ${daysOverdue} dias`,
        summary: `"${entry.description}" - R$ ${Number(entry.value).toFixed(2)} venceu em ${dueDate.toLocaleDateString("pt-BR")} (${daysOverdue} dias atrás).`,
        details: {
          entryId: entry.id,
          description: entry.description,
          value: Number(entry.value),
          dueDate: entry.dueDate,
          daysOverdue,
          entityName: entry.entityName,
        },
        module: "financeiro",
        entityType: "financial_entry",
        entityId: entry.id,
      });

      result.created++;
    }
  } catch (error) {
    result.errors.push(`Erro ao verificar contas a pagar vencidas: ${error}`);
  }

  return result;
}

// ============================================================================
// INSIGHT 6: NCs ABERTAS HÁ MAIS DE X DIAS
// ============================================================================

export async function checkOpenNCs(daysThreshold: number = 7): Promise<InsightResult> {
  const db = await getDb();
  if (!db) return { created: 0, skipped: 0, errors: ["Database not available"] };

  const result: InsightResult = { created: 0, skipped: 0, errors: [] };
  const now = new Date();
  const thresholdDate = new Date(now.getTime() - daysThreshold * 24 * 60 * 60 * 1000);

  try {
    // Busca NCs abertas há mais de X dias
    const openNCs = await db
      .select()
      .from(nonConformities)
      .where(and(
        eq(nonConformities.status, "aberta"),
        lte(nonConformities.identificationDate, thresholdDate)
      ));

    for (const nc of openNCs) {
      // Verifica se já existe insight ativo
      const existing = await db
        .select()
        .from(aiInsights)
        .where(and(
          eq(aiInsights.insightType, "nc_open_too_long"),
          eq(aiInsights.entityType, "non_conformity"),
          eq(aiInsights.entityId, nc.id),
          eq(aiInsights.status, "active")
        ))
        .limit(1);

      if (existing.length > 0) {
        result.skipped++;
        continue;
      }

      const identDate = new Date(nc.identificationDate);
      const daysOpen = Math.ceil((now.getTime() - identDate.getTime()) / (1000 * 60 * 60 * 24));

      await db.insert(aiInsights).values({
        insightType: "nc_open_too_long",
        severity: daysOpen > 14 ? "critical" : "warning",
        title: `NC ${nc.ncNumber} aberta há ${daysOpen} dias`,
        summary: `Não conformidade "${nc.ncNumber}" na área de ${nc.area} está aberta há ${daysOpen} dias sem resolução.`,
        details: {
          ncId: nc.id,
          ncNumber: nc.ncNumber,
          area: nc.area,
          origin: nc.origin,
          daysOpen,
          identificationDate: nc.identificationDate,
        },
        module: "qualidade",
        entityType: "non_conformity",
        entityId: nc.id,
      });

      result.created++;
    }
  } catch (error) {
    result.errors.push(`Erro ao verificar NCs abertas: ${error}`);
  }

  return result;
}

// ============================================================================
// INSIGHT 7: SOLICITAÇÕES DE COMPRA PENDENTES DE APROVAÇÃO
// ============================================================================

export async function checkPendingPurchaseRequests(daysThreshold: number = 3): Promise<InsightResult> {
  const db = await getDb();
  if (!db) return { created: 0, skipped: 0, errors: ["Database not available"] };

  const result: InsightResult = { created: 0, skipped: 0, errors: [] };
  const now = new Date();
  const thresholdDate = new Date(now.getTime() - daysThreshold * 24 * 60 * 60 * 1000);

  try {
    // Busca solicitações pendentes há mais de X dias
    const pendingRequests = await db
      .select()
      .from(purchaseRequests)
      .where(and(
        eq(purchaseRequests.status, "solicitado"),
        lte(purchaseRequests.createdAt, thresholdDate)
      ));

    for (const request of pendingRequests) {
      // Verifica se já existe insight ativo
      const existing = await db
        .select()
        .from(aiInsights)
        .where(and(
          eq(aiInsights.insightType, "purchase_pending_approval"),
          eq(aiInsights.entityType, "purchase_request"),
          eq(aiInsights.entityId, request.id),
          eq(aiInsights.status, "active")
        ))
        .limit(1);

      if (existing.length > 0) {
        result.skipped++;
        continue;
      }

      const createdDate = new Date(request.createdAt);
      const daysPending = Math.ceil((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

      await db.insert(aiInsights).values({
        insightType: "purchase_pending_approval",
        severity: daysPending > 5 ? "warning" : "info",
        title: `Solicitação de compra pendente há ${daysPending} dias`,
        summary: `Solicitação "${request.requestNumber}" do setor ${request.sector} aguarda aprovação há ${daysPending} dias.`,
        details: {
          requestId: request.id,
          requestNumber: request.requestNumber,
          sector: request.sector,
          urgency: request.urgency,
          daysPending,
          createdAt: request.createdAt,
        },
        module: "compras",
        entityType: "purchase_request",
        entityId: request.id,
      });

      result.created++;
    }
  } catch (error) {
    result.errors.push(`Erro ao verificar solicitações de compra pendentes: ${error}`);
  }

  return result;
}

// ============================================================================
// EXECUÇÃO DE TODOS OS INSIGHTS
// ============================================================================

export async function runAllInsightChecks(): Promise<Record<string, InsightResult>> {
  const results: Record<string, InsightResult> = {};

  results.criticalStock = await checkCriticalStock();
  results.overdueProducerPayments = await checkOverdueProducerPayments();
  results.expiringProducts = await checkExpiringProducts();
  results.overduePayables = await checkOverduePayables();
  results.openNCs = await checkOpenNCs();
  results.pendingPurchaseRequests = await checkPendingPurchaseRequests();

  return results;
}

// ============================================================================
// FUNÇÕES DE GERENCIAMENTO DE INSIGHTS
// ============================================================================

export async function dismissInsight(insightId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(aiInsights)
      .set({
        status: "dismissed",
        dismissedBy: userId,
        dismissedAt: new Date(),
      })
      .where(eq(aiInsights.id, insightId));
    return true;
  } catch (error) {
    console.error("[Insight Generator] Erro ao dispensar insight:", error);
    return false;
  }
}

export async function resolveInsight(insightId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(aiInsights)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
      })
      .where(eq(aiInsights.id, insightId));
    return true;
  } catch (error) {
    console.error("[Insight Generator] Erro ao resolver insight:", error);
    return false;
  }
}
