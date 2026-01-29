import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

// ============================================================================
// TIPOS DE RELATÓRIOS
// ============================================================================
export type ReportType = 
  | "production_daily"
  | "production_monthly"
  | "loads_summary"
  | "producers_ranking"
  | "quality_analysis"
  | "financial_summary"
  | "inventory_status"
  | "costs_analysis";

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  producerId?: number;
  skuId?: number;
  status?: string;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  filters: ReportFilters;
  data: any;
  summary?: Record<string, any>;
}

// ============================================================================
// RELATÓRIO DE PRODUÇÃO DIÁRIA
// ============================================================================
export async function generateProductionDailyReport(
  date: Date
): Promise<ReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const entries = await db
    .select()
    .from(schema.productionEntries)
    .where(and(
      gte(schema.productionEntries.createdAt, startOfDay),
      lte(schema.productionEntries.createdAt, endOfDay)
    ))
    .orderBy(desc(schema.productionEntries.createdAt));
  
  // Calcular totais
  let totalQuantity = 0;
  let totalWaste = 0;
  
  for (const entry of entries) {
    totalQuantity += Number(entry.quantityProduced) || 0;
    totalWaste += Number(entry.losses) || 0;
  }
  
  return {
    title: "Relatório de Produção Diária",
    subtitle: date.toLocaleDateString("pt-BR"),
    generatedAt: new Date(),
    filters: { startDate: startOfDay, endDate: endOfDay },
    data: entries,
    summary: {
      totalEntries: entries.length,
      totalQuantity,
      totalWaste,
      efficiency: totalQuantity > 0 ? ((totalQuantity - totalWaste) / totalQuantity * 100).toFixed(2) : 0,
    },
  };
}

// ============================================================================
// RELATÓRIO DE CARGAS
// ============================================================================
export async function generateLoadsReport(
  filters: ReportFilters
): Promise<ReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let query = db.select().from(schema.coconutLoads);
  
  const loads = await query.orderBy(desc(schema.coconutLoads.createdAt));
  
  // Calcular totais
  let totalWeight = 0;
  let totalValue = 0;
  
  for (const load of loads) {
    totalWeight += Number(load.netWeight) || 0;
    // totalValue calculado a partir do peso e preço
  }
  
  return {
    title: "Relatório de Cargas de Coco",
    generatedAt: new Date(),
    filters,
    data: loads,
    summary: {
      totalLoads: loads.length,
      totalWeight,
      totalValue,
      averageWeight: loads.length > 0 ? (totalWeight / loads.length).toFixed(2) : 0,
    },
  };
}

// ============================================================================
// RELATÓRIO DE RANKING DE PRODUTORES
// ============================================================================
export async function generateProducersRankingReport(
  filters: ReportFilters
): Promise<ReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Buscar produtores com suas cargas
  const producers = await db.select().from(schema.producers);
  const loads = await db.select().from(schema.coconutLoads);
  
  // Calcular ranking
  const ranking = producers.map(producer => {
    const producerLoads = loads.filter(l => l.producerId === producer.id);
    const totalWeight = producerLoads.reduce((sum, l) => sum + (Number(l.grossWeight) || 0), 0);
    const totalValue = 0; // Calculado a partir de pagamentos
    const avgQuality = 0; // Calculado a partir de análises de qualidade
    
    return {
      producerId: producer.id,
      producerName: producer.name,
      totalLoads: producerLoads.length,
      totalWeight,
      totalValue,
      avgQuality: avgQuality.toFixed(2),
    };
  }).sort((a, b) => b.totalWeight - a.totalWeight);
  
  return {
    title: "Ranking de Produtores",
    generatedAt: new Date(),
    filters,
    data: ranking,
    summary: {
      totalProducers: producers.length,
      activeProducers: ranking.filter(r => r.totalLoads > 0).length,
    },
  };
}

// ============================================================================
// RELATÓRIO DE ANÁLISES DE QUALIDADE
// ============================================================================
export async function generateQualityReport(
  filters: ReportFilters
): Promise<ReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const analyses = await db
    .select()
    .from(schema.qualityAnalyses)
    .orderBy(desc(schema.qualityAnalyses.createdAt));
  
  // Calcular estatísticas
  const approved = analyses.filter(a => a.result === "conforme").length;
  const rejected = analyses.filter(a => a.result === "nao_conforme").length;
  const pending = analyses.filter(a => a.result === "pendente").length;
  
  return {
    title: "Relatório de Análises de Qualidade",
    generatedAt: new Date(),
    filters,
    data: analyses,
    summary: {
      totalAnalyses: analyses.length,
      approved,
      rejected,
      pending,
      approvalRate: analyses.length > 0 ? ((approved / analyses.length) * 100).toFixed(2) : 0,
    },
  };
}

// ============================================================================
// RELATÓRIO FINANCEIRO
// ============================================================================
export async function generateFinancialReport(
  filters: ReportFilters
): Promise<ReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const entries = await db
    .select()
    .from(schema.financialEntries)
    .orderBy(desc(schema.financialEntries.createdAt));
  
  // Calcular totais
  let totalReceitas = 0;
  let totalDespesas = 0;
  
  for (const entry of entries) {
    if (entry.entryType === "receber") {
      totalReceitas += Number(entry.value) || 0;
    } else {
      totalDespesas += Number(entry.value) || 0;
    }
  }
  
  return {
    title: "Relatório Financeiro",
    generatedAt: new Date(),
    filters,
    data: entries,
    summary: {
      totalEntries: entries.length,
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas - totalDespesas,
    },
  };
}

// ============================================================================
// RELATÓRIO DE ESTOQUE
// ============================================================================
export async function generateInventoryReport(): Promise<ReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const warehouseItems = await db.select().from(schema.warehouseItems);
  const finishedGoods = await db.select().from(schema.finishedGoodsInventory);
  
  // Calcular alertas de estoque baixo
  const lowStockItems = warehouseItems.filter(item => {
    const current = Number(item.currentStock) || 0;
    const min = Number(item.minimumStock) || 0;
    return current <= min;
  });
  
  return {
    title: "Relatório de Estoque",
    generatedAt: new Date(),
    filters: {},
    data: {
      warehouseItems,
      finishedGoods,
    },
    summary: {
      totalWarehouseItems: warehouseItems.length,
      totalFinishedGoods: finishedGoods.length,
      lowStockAlerts: lowStockItems.length,
    },
  };
}

// ============================================================================
// RELATÓRIO DE CUSTOS
// ============================================================================
export async function generateCostsReport(
  filters: ReportFilters
): Promise<ReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const costs = await db
    .select()
    .from(schema.productionCosts)
    .orderBy(desc(schema.productionCosts.createdAt));
  
  const fixedCosts = await db.select().from(schema.fixedCosts);
  
  // Calcular totais
  let totalDirectCosts = 0;
  let totalIndirectCosts = 0;
  let totalFixedCosts = 0;
  
  for (const cost of costs) {
    totalDirectCosts += Number(cost.rawMaterialCost) || 0;
    totalDirectCosts += Number(cost.laborCost) || 0;
    totalIndirectCosts += Number(cost.overheadCost) || 0;
  }
  
  for (const fc of fixedCosts) {
    totalFixedCosts += Number(fc.monthlyValue) || 0;
  }
  
  return {
    title: "Relatório de Custos",
    generatedAt: new Date(),
    filters,
    data: {
      productionCosts: costs,
      fixedCosts,
    },
    summary: {
      totalDirectCosts,
      totalIndirectCosts,
      totalFixedCosts,
      totalCosts: totalDirectCosts + totalIndirectCosts + totalFixedCosts,
    },
  };
}

// ============================================================================
// GERAR RELATÓRIO GENÉRICO
// ============================================================================
export async function generateReport(
  type: ReportType,
  filters: ReportFilters = {}
): Promise<ReportData> {
  switch (type) {
    case "production_daily":
      return generateProductionDailyReport(filters.startDate || new Date());
    case "loads_summary":
      return generateLoadsReport(filters);
    case "producers_ranking":
      return generateProducersRankingReport(filters);
    case "quality_analysis":
      return generateQualityReport(filters);
    case "financial_summary":
      return generateFinancialReport(filters);
    case "inventory_status":
      return generateInventoryReport();
    case "costs_analysis":
      return generateCostsReport(filters);
    default:
      throw new Error(`Tipo de relatório não suportado: ${type}`);
  }
}
