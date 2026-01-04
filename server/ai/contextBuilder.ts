/**
 * AI Context Builder - Agrega dados do ERP para fornecer contexto ao LLM
 * 
 * Este módulo implementa o padrão RAG (Retrieval-Augmented Generation):
 * 1. SQL Views: Resumos agregados (totais, médias, tendências)
 * 2. Event Log: Histórico recente de eventos (ai_events)
 * 3. Textual Sources: Notas, descrições, observações relevantes
 */

import { getDb } from "../db";
import { 
  aiEvents, 
  aiInsights,
  aiSources,
  coconutLoads,
  producers,
  producerPayables,
  warehouseItems,
  warehouseMovements,
  skus,
  finishedGoodsInventory,
  productionEntries,
  productionIssues,
  purchaseRequests,
  financialEntries,
  qualityAnalyses,
  nonConformities,
  employees,
} from "../../drizzle/schema";
import { desc, eq, gte, lte, and, sql, count, sum, avg } from "drizzle-orm";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface ContextLayer {
  type: "summary" | "events" | "sources" | "insights";
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface AIContext {
  layers: ContextLayer[];
  tokenEstimate: number;
  generatedAt: Date;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// ============================================================================
// FUNÇÕES DE AGREGAÇÃO (SQL Views simuladas)
// ============================================================================

/**
 * Resumo geral do sistema - KPIs principais
 */
export async function getSystemSummary(dateRange?: DateRange): Promise<Record<string, unknown>> {
  const db = await getDb();
  if (!db) return {};

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = dateRange?.start || startOfMonth;
  const end = dateRange?.end || now;

  try {
    // Total de cargas recebidas no período
    const loadsResult = await db
      .select({
        total: count(),
        totalWeight: sum(coconutLoads.netWeight),
      })
      .from(coconutLoads)
      .where(and(
        gte(coconutLoads.receivedAt, start),
        lte(coconutLoads.receivedAt, end)
      ));

    // Total de pagamentos pendentes
    const payablesResult = await db
      .select({
        pendingCount: count(),
        pendingValue: sum(producerPayables.totalValue),
      })
      .from(producerPayables)
      .where(eq(producerPayables.status, "pendente"));

    // Itens com estoque baixo
    const lowStockResult = await db
      .select({ count: count() })
      .from(warehouseItems)
      .where(sql`${warehouseItems.currentStock} <= ${warehouseItems.minimumStock}`);

    // Produtores ativos
    const producersResult = await db
      .select({ count: count() })
      .from(producers)
      .where(eq(producers.status, "ativo"));

    return {
      periodo: { inicio: start.toISOString(), fim: end.toISOString() },
      recebimento: {
        totalCargas: loadsResult[0]?.total || 0,
        pesoTotalKg: Number(loadsResult[0]?.totalWeight) || 0,
      },
      pagamentos: {
        pendentes: payablesResult[0]?.pendingCount || 0,
        valorPendente: Number(payablesResult[0]?.pendingValue) || 0,
      },
      almoxarifado: {
        itensEstoqueBaixo: lowStockResult[0]?.count || 0,
      },
      produtores: {
        ativos: producersResult[0]?.count || 0,
      },
    };
  } catch (error) {
    console.error("[Context Builder] Erro ao gerar resumo:", error);
    return {};
  }
}

/**
 * Resumo de produção
 */
export async function getProductionSummary(dateRange?: DateRange): Promise<Record<string, unknown>> {
  const db = await getDb();
  if (!db) return {};

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = dateRange?.start || startOfMonth;
  const end = dateRange?.end || now;

  try {
    // Apontamentos de produção
    const productionResult = await db
      .select({
        total: count(),
        totalProducedKg: sum(productionEntries.quantityProduced),
      })
      .from(productionEntries)
      .where(and(
        gte(productionEntries.productionDate, start),
        lte(productionEntries.productionDate, end)
      ));

    // Problemas de produção abertos
    const issuesResult = await db
      .select({ count: count() })
      .from(productionIssues)
      .where(eq(productionIssues.status, "aberto"));

    return {
      periodo: { inicio: start.toISOString(), fim: end.toISOString() },
      producao: {
        totalApontamentos: productionResult[0]?.total || 0,
        totalProduzidoKg: Number(productionResult[0]?.totalProducedKg) || 0,
      },
      problemas: {
        abertos: issuesResult[0]?.count || 0,
      },
    };
  } catch (error) {
    console.error("[Context Builder] Erro ao gerar resumo de produção:", error);
    return {};
  }
}

/**
 * Resumo financeiro
 */
export async function getFinancialSummary(dateRange?: DateRange): Promise<Record<string, unknown>> {
  const db = await getDb();
  if (!db) return {};

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = dateRange?.start || startOfMonth;
  const end = dateRange?.end || now;

  try {
    // Contas a pagar pendentes
    const payablesResult = await db
      .select({
        count: count(),
        total: sum(financialEntries.value),
      })
      .from(financialEntries)
      .where(and(
        eq(financialEntries.entryType, "pagar"),
        eq(financialEntries.status, "pendente")
      ));

    // Contas a receber pendentes
    const receivablesResult = await db
      .select({
        count: count(),
        total: sum(financialEntries.value),
      })
      .from(financialEntries)
      .where(and(
        eq(financialEntries.entryType, "receber"),
        eq(financialEntries.status, "pendente")
      ));

    // Contas vencidas
    const overdueResult = await db
      .select({
        count: count(),
        total: sum(financialEntries.value),
      })
      .from(financialEntries)
      .where(and(
        eq(financialEntries.status, "pendente"),
        lte(financialEntries.dueDate, now)
      ));

    return {
      contasAPagar: {
        pendentes: payablesResult[0]?.count || 0,
        valorTotal: Number(payablesResult[0]?.total) || 0,
      },
      contasAReceber: {
        pendentes: receivablesResult[0]?.count || 0,
        valorTotal: Number(receivablesResult[0]?.total) || 0,
      },
      vencidas: {
        quantidade: overdueResult[0]?.count || 0,
        valorTotal: Number(overdueResult[0]?.total) || 0,
      },
    };
  } catch (error) {
    console.error("[Context Builder] Erro ao gerar resumo financeiro:", error);
    return {};
  }
}

/**
 * Resumo de qualidade
 */
export async function getQualitySummary(dateRange?: DateRange): Promise<Record<string, unknown>> {
  const db = await getDb();
  if (!db) return {};

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = dateRange?.start || startOfMonth;
  const end = dateRange?.end || now;

  try {
    // Análises de qualidade
    const analysesResult = await db
      .select({
        total: count(),
        approved: sql<number>`SUM(CASE WHEN ${qualityAnalyses.result} = 'aprovado' THEN 1 ELSE 0 END)`,
        rejected: sql<number>`SUM(CASE WHEN ${qualityAnalyses.result} = 'reprovado' THEN 1 ELSE 0 END)`,
      })
      .from(qualityAnalyses)
      .where(and(
        gte(qualityAnalyses.analysisDate, start),
        lte(qualityAnalyses.analysisDate, end)
      ));

    // NCs abertas
    const ncsResult = await db
      .select({ count: count() })
      .from(nonConformities)
      .where(eq(nonConformities.status, "aberta"));

    return {
      periodo: { inicio: start.toISOString(), fim: end.toISOString() },
      analises: {
        total: analysesResult[0]?.total || 0,
        aprovadas: Number(analysesResult[0]?.approved) || 0,
        reprovadas: Number(analysesResult[0]?.rejected) || 0,
      },
      naoConformidades: {
        abertas: ncsResult[0]?.count || 0,
      },
    };
  } catch (error) {
    console.error("[Context Builder] Erro ao gerar resumo de qualidade:", error);
    return {};
  }
}

// ============================================================================
// FUNÇÕES DE EVENTOS
// ============================================================================

/**
 * Busca eventos recentes do sistema
 */
export async function getRecentEvents(
  limit: number = 50,
  module?: string
): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const events = module
      ? await db
          .select()
          .from(aiEvents)
          .where(eq(aiEvents.module, module))
          .orderBy(desc(aiEvents.createdAt))
          .limit(limit)
      : await db
          .select()
          .from(aiEvents)
          .orderBy(desc(aiEvents.createdAt))
          .limit(limit);
    return events.map(e => ({
      id: e.id,
      tipo: e.eventType,
      modulo: e.module,
      entidade: `${e.entityType}#${e.entityId}`,
      dados: e.payload,
      quando: e.createdAt,
    }));
  } catch (error) {
    console.error("[Context Builder] Erro ao buscar eventos:", error);
    return [];
  }
}

// ============================================================================
// FUNÇÕES DE INSIGHTS
// ============================================================================

/**
 * Busca insights ativos
 */
export async function getActiveInsights(): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const insights = await db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.status, "active"))
      .orderBy(desc(aiInsights.generatedAt))
      .limit(20);

    return insights.map(i => ({
      id: i.id,
      tipo: i.insightType,
      severidade: i.severity,
      titulo: i.title,
      resumo: i.summary,
      modulo: i.module,
      quando: i.generatedAt,
    }));
  } catch (error) {
    console.error("[Context Builder] Erro ao buscar insights:", error);
    return [];
  }
}

// ============================================================================
// FUNÇÕES DE FONTES/EVIDÊNCIAS
// ============================================================================

/**
 * Cria uma fonte/evidência para rastreabilidade
 */
export async function createSource(
  entityType: string,
  entityId: number,
  label: string,
  url?: string,
  snippet?: string
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(aiSources).values({
      entityType,
      entityId,
      label,
      url,
      snippet,
    });
    return result[0].insertId;
  } catch (error) {
    console.error("[Context Builder] Erro ao criar fonte:", error);
    return null;
  }
}

/**
 * Busca fontes por IDs
 */
export async function getSourcesByIds(ids: number[]): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  if (!db || ids.length === 0) return [];

  try {
    const sources = await db
      .select()
      .from(aiSources)
      .where(sql`${aiSources.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);

    return sources.map(s => ({
      id: s.id,
      tipo: s.entityType,
      entidadeId: s.entityId,
      label: s.label,
      url: s.url,
      trecho: s.snippet,
    }));
  } catch (error) {
    console.error("[Context Builder] Erro ao buscar fontes:", error);
    return [];
  }
}

// ============================================================================
// CONSTRUTOR DE CONTEXTO PRINCIPAL
// ============================================================================

/**
 * Constrói o contexto completo para o LLM
 */
export async function buildContext(
  options: {
    includeSummary?: boolean;
    includeProduction?: boolean;
    includeFinancial?: boolean;
    includeQuality?: boolean;
    includeEvents?: boolean;
    includeInsights?: boolean;
    eventLimit?: number;
    module?: string;
    dateRange?: DateRange;
  } = {}
): Promise<AIContext> {
  const layers: ContextLayer[] = [];
  const now = new Date();

  // Resumo geral do sistema
  if (options.includeSummary !== false) {
    const summary = await getSystemSummary(options.dateRange);
    layers.push({
      type: "summary",
      data: { resumoGeral: summary },
      timestamp: now,
    });
  }

  // Resumo de produção
  if (options.includeProduction) {
    const production = await getProductionSummary(options.dateRange);
    layers.push({
      type: "summary",
      data: { resumoProducao: production },
      timestamp: now,
    });
  }

  // Resumo financeiro
  if (options.includeFinancial) {
    const financial = await getFinancialSummary(options.dateRange);
    layers.push({
      type: "summary",
      data: { resumoFinanceiro: financial },
      timestamp: now,
    });
  }

  // Resumo de qualidade
  if (options.includeQuality) {
    const quality = await getQualitySummary(options.dateRange);
    layers.push({
      type: "summary",
      data: { resumoQualidade: quality },
      timestamp: now,
    });
  }

  // Eventos recentes
  if (options.includeEvents !== false) {
    const events = await getRecentEvents(options.eventLimit || 30, options.module);
    layers.push({
      type: "events",
      data: { eventosRecentes: events },
      timestamp: now,
    });
  }

  // Insights ativos
  if (options.includeInsights !== false) {
    const insights = await getActiveInsights();
    layers.push({
      type: "insights",
      data: { insightsAtivos: insights },
      timestamp: now,
    });
  }

  // Estima tokens (aproximação: 1 token ≈ 4 caracteres)
  const contextString = JSON.stringify(layers);
  const tokenEstimate = Math.ceil(contextString.length / 4);

  return {
    layers,
    tokenEstimate,
    generatedAt: now,
  };
}

/**
 * Formata o contexto como texto para o prompt do LLM
 */
export function formatContextForPrompt(context: AIContext): string {
  const sections: string[] = [];

  sections.push("=== CONTEXTO DO SISTEMA ERP COCO LITORÂNEO ===\n");
  sections.push(`Gerado em: ${context.generatedAt.toISOString()}\n`);

  for (const layer of context.layers) {
    if (layer.type === "summary") {
      sections.push("\n--- RESUMOS ---");
      sections.push(JSON.stringify(layer.data, null, 2));
    } else if (layer.type === "events") {
      sections.push("\n--- EVENTOS RECENTES ---");
      sections.push(JSON.stringify(layer.data, null, 2));
    } else if (layer.type === "insights") {
      sections.push("\n--- INSIGHTS ATIVOS ---");
      sections.push(JSON.stringify(layer.data, null, 2));
    }
  }

  sections.push("\n=== FIM DO CONTEXTO ===");

  return sections.join("\n");
}
