import { eq, and, desc, sql, gte, lte, between } from "drizzle-orm";
import { getDb } from "../db";
import {
  budgets,
  budgetLines,
  budgetActuals,
  budgetScenarios,
  budgetApprovals,
  budgetForecasts,
  budgetIndicators,
  budgetRevisions,
  budgetAiInsights,
  financialEntries,
  InsertBudget,
  InsertBudgetLine,
  InsertBudgetScenario,
  InsertBudgetApproval,
  InsertBudgetForecast,
  InsertBudgetRevision,
  InsertBudgetAiInsight,
} from "../../drizzle/schema";

// ============================================================================
// BUDGETS - CRUD Principal
// ============================================================================

export async function createBudget(data: InsertBudget) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(budgets).values(data);
  return { id: result[0].insertId };
}

export async function getBudgetById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(budgets).where(eq(budgets.id, id));
  return result[0] || null;
}

export async function listBudgets(year?: number) {
  const db = await getDb();
  if (!db) return [];
  if (year) {
    return db.select().from(budgets).where(eq(budgets.year, year)).orderBy(desc(budgets.createdAt));
  }
  return db.select().from(budgets).orderBy(desc(budgets.year), desc(budgets.createdAt));
}

export async function updateBudget(id: number, data: Partial<InsertBudget>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(budgets).set(data).where(eq(budgets.id, id));
  return { success: true };
}

export async function deleteBudget(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(budgets).where(eq(budgets.id, id));
  return { success: true };
}

// ============================================================================
// BUDGET LINES - Linhas do Orçamento
// ============================================================================

export async function createBudgetLine(data: InsertBudgetLine) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Calcular total do ano
  const total = Number(data.jan || 0) + Number(data.fev || 0) + Number(data.mar || 0) +
    Number(data.abr || 0) + Number(data.mai || 0) + Number(data.jun || 0) +
    Number(data.jul || 0) + Number(data.ago || 0) + Number(data.set || 0) +
    Number(data.out || 0) + Number(data.nov || 0) + Number(data.dez || 0);
  
  const result = await db.insert(budgetLines).values({
    ...data,
    totalYear: total.toString(),
  });
  return { id: result[0].insertId };
}

export async function getBudgetLines(budgetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(budgetLines).where(eq(budgetLines.budgetId, budgetId));
}

export async function getBudgetLinesByCostCenter(budgetId: number, costCenter: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(budgetLines)
    .where(and(
      eq(budgetLines.budgetId, budgetId),
      eq(budgetLines.costCenter, costCenter as any)
    ));
}

export async function updateBudgetLine(id: number, data: Partial<InsertBudgetLine>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Recalcular total se valores mensais mudaram
  if (data.jan !== undefined || data.fev !== undefined || data.mar !== undefined ||
      data.abr !== undefined || data.mai !== undefined || data.jun !== undefined ||
      data.jul !== undefined || data.ago !== undefined || data.set !== undefined ||
      data.out !== undefined || data.nov !== undefined || data.dez !== undefined) {
    const existing = await db.select().from(budgetLines).where(eq(budgetLines.id, id));
    if (existing[0]) {
      const merged = { ...existing[0], ...data };
      const total = Number(merged.jan || 0) + Number(merged.fev || 0) + Number(merged.mar || 0) +
        Number(merged.abr || 0) + Number(merged.mai || 0) + Number(merged.jun || 0) +
        Number(merged.jul || 0) + Number(merged.ago || 0) + Number(merged.set || 0) +
        Number(merged.out || 0) + Number(merged.nov || 0) + Number(merged.dez || 0);
      data.totalYear = total.toString();
    }
  }
  await db.update(budgetLines).set(data).where(eq(budgetLines.id, id));
  return { success: true };
}

export async function deleteBudgetLine(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(budgetLines).where(eq(budgetLines.id, id));
  return { success: true };
}

// ============================================================================
// BUDGET ACTUALS - Realizado
// ============================================================================

export async function getBudgetActuals(budgetId: number, month?: number) {
  const db = await getDb();
  if (!db) return [];
  const lines = await getBudgetLines(budgetId);
  const lineIds = lines.map(l => l.id);
  
  if (lineIds.length === 0) return [];
  
  let query = db.select().from(budgetActuals)
    .where(sql`${budgetActuals.budgetLineId} IN (${sql.join(lineIds.map(id => sql`${id}`), sql`, `)})`);
  
  return query;
}

export async function calculateActualsFromFinancial(budgetId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  const lines = await getBudgetLines(budgetId);
  const results = [];
  
  for (const line of lines) {
    // Buscar entradas financeiras do mês correspondente à categoria
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const entries = await db.select({
      total: sql<string>`COALESCE(SUM(ABS(${financialEntries.value})), 0)`
    }).from(financialEntries)
      .where(and(
        gte(financialEntries.dueDate, startDate),
        lte(financialEntries.dueDate, endDate)
      ));
    
    const actualValue = Number(entries[0]?.total || 0);
    const monthField = getMonthField(month);
    const budgetedValue = Number((line as any)[monthField] || 0);
    const varianceValue = actualValue - budgetedValue;
    const variancePercent = budgetedValue > 0 ? (varianceValue / budgetedValue) * 100 : 0;
    
    let status: "verde" | "amarelo" | "vermelho" = "verde";
    if (variancePercent > 10) status = "vermelho";
    else if (variancePercent > 0) status = "amarelo";
    
    // Inserir ou atualizar actual
    const existing = await db.select().from(budgetActuals)
      .where(and(
        eq(budgetActuals.budgetLineId, line.id),
        eq(budgetActuals.month, month),
        eq(budgetActuals.year, year)
      ));
    
    if (existing.length > 0) {
      await db.update(budgetActuals).set({
        actualValue: actualValue.toString(),
        varianceValue: varianceValue.toString(),
        variancePercent: variancePercent.toString(),
        status,
      }).where(eq(budgetActuals.id, existing[0].id));
    } else {
      await db.insert(budgetActuals).values({
        budgetLineId: line.id,
        month,
        year,
        actualValue: actualValue.toString(),
        budgetedValue: budgetedValue.toString(),
        varianceValue: varianceValue.toString(),
        variancePercent: variancePercent.toString(),
        status,
      });
    }
    
    results.push({ lineId: line.id, actualValue, budgetedValue, varianceValue, variancePercent, status });
  }
  
  return results;
}

function getMonthField(month: number): string {
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return months[month - 1];
}

// ============================================================================
// BUDGET SCENARIOS - Cenários
// ============================================================================

export async function createScenario(data: InsertBudgetScenario) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(budgetScenarios).values(data);
  return { id: result[0].insertId };
}

export async function getScenarios(budgetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(budgetScenarios).where(eq(budgetScenarios.budgetId, budgetId));
}

export async function compareScenarios(budgetId: number) {
  const db = getDb();
  const scenarios = await getScenarios(budgetId);
  return scenarios.map(s => ({
    id: s.id,
    name: s.name,
    type: s.type,
    totalRevenue: Number(s.totalRevenue),
    totalExpenses: Number(s.totalExpenses),
    netResult: Number(s.netResult),
    assumptions: s.assumptions,
  }));
}

export async function deleteScenario(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(budgetScenarios).where(eq(budgetScenarios.id, id));
  return { success: true };
}

// ============================================================================
// BUDGET APPROVALS - Workflow de Aprovação
// ============================================================================

export async function createApprovalWorkflow(budgetId: number, createdBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Criar 3 etapas de aprovação
  const steps = [
    { step: 1, role: "gerente" as const },
    { step: 2, role: "diretor" as const },
    { step: 3, role: "ceo" as const },
  ];
  
  for (const s of steps) {
    await db.insert(budgetApprovals).values({
      budgetId,
      step: s.step,
      role: s.role,
      status: "pendente",
      assignedTo: createdBy, // Será atualizado com o usuário correto
    });
  }
  
  // Atualizar status do orçamento
  await db.update(budgets).set({ status: "em_aprovacao" }).where(eq(budgets.id, budgetId));
  
  return { success: true };
}

export async function getApprovalStatus(budgetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(budgetApprovals)
    .where(eq(budgetApprovals.budgetId, budgetId))
    .orderBy(budgetApprovals.step);
}

export async function approveStep(approvalId: number, userId: number, comments?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(budgetApprovals).set({
    status: "aprovado",
    approvedBy: userId,
    approvedAt: new Date(),
    comments,
  }).where(eq(budgetApprovals.id, approvalId));
  
  // Verificar se todas as etapas foram aprovadas
  const approval = await db.select().from(budgetApprovals).where(eq(budgetApprovals.id, approvalId));
  if (approval[0]) {
    const allApprovals = await getApprovalStatus(approval[0].budgetId);
    const allApproved = allApprovals.every(a => a.status === "aprovado");
    
    if (allApproved) {
      await db.update(budgets).set({
        status: "aprovado",
        approvedBy: userId,
        approvedAt: new Date(),
      }).where(eq(budgets.id, approval[0].budgetId));
    }
  }
  
  return { success: true };
}

export async function rejectStep(approvalId: number, userId: number, comments: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(budgetApprovals).set({
    status: "rejeitado",
    approvedBy: userId,
    approvedAt: new Date(),
    comments,
  }).where(eq(budgetApprovals.id, approvalId));
  
  // Atualizar status do orçamento para revisão
  const approval = await db.select().from(budgetApprovals).where(eq(budgetApprovals.id, approvalId));
  if (approval[0]) {
    await db.update(budgets).set({ status: "revisao" }).where(eq(budgets.id, approval[0].budgetId));
  }
  
  return { success: true };
}

export async function delegateApproval(approvalId: number, delegatedTo: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(budgetApprovals).set({
    status: "delegado",
    delegatedTo,
    delegatedReason: reason,
  }).where(eq(budgetApprovals.id, approvalId));
  return { success: true };
}

// ============================================================================
// BUDGET FORECASTS - Forecast Rolling
// ============================================================================

export async function createForecast(data: InsertBudgetForecast) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(budgetForecasts).values(data);
  return { id: result[0].insertId };
}

export async function getForecasts(budgetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(budgetForecasts)
    .where(eq(budgetForecasts.budgetId, budgetId))
    .orderBy(desc(budgetForecasts.forecastYear), desc(budgetForecasts.forecastMonth));
}

export async function generateRollingForecast(budgetId: number, currentMonth: number, currentYear: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const lines = await getBudgetLines(budgetId);
  const forecasts = [];
  
  for (const line of lines) {
    // Projetar próximos 12 meses baseado na tendência atual
    for (let i = 0; i < 12; i++) {
      let targetMonth = currentMonth + i;
      let targetYear = currentYear;
      if (targetMonth > 12) {
        targetMonth -= 12;
        targetYear += 1;
      }
      
      const monthField = getMonthField(targetMonth);
      const originalBudget = Number((line as any)[monthField] || 0);
      
      // Calcular forecast baseado em tendência (simplificado)
      const currentForecast = originalBudget; // Pode ser ajustado com IA
      
      forecasts.push({
        budgetId,
        budgetLineId: line.id,
        forecastMonth: currentMonth,
        forecastYear: currentYear,
        targetMonth,
        targetYear,
        originalBudget: originalBudget.toString(),
        currentForecast: currentForecast.toString(),
        confidenceLevel: "media" as const,
      });
    }
  }
  
  // Inserir forecasts em batch
  if (forecasts.length > 0) {
    await db.insert(budgetForecasts).values(forecasts);
  }
  
  return { count: forecasts.length };
}

// ============================================================================
// BUDGET INDICATORS - Indicadores Avançados
// ============================================================================

export async function calculateIndicators(budgetId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const lines = await getBudgetLines(budgetId);
  const actuals = await getBudgetActuals(budgetId, month);
  
  let totalBudgeted = 0;
  let totalActual = 0;
  let linesOnBudget = 0;
  let linesOverBudget = 0;
  let linesUnderBudget = 0;
  
  for (const actual of actuals) {
    const budgetedValue = Number(actual.budgetedValue);
    const actualValue = Number(actual.actualValue);
    const variance = Number(actual.variancePercent);
    
    totalBudgeted += budgetedValue;
    totalActual += actualValue;
    
    if (variance <= 0) linesUnderBudget++;
    else if (variance <= 10) linesOnBudget++;
    else linesOverBudget++;
  }
  
  const burnRate = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;
  const runRate = (totalActual / month) * 12; // Projeção anualizada
  const varianceAccumulated = totalActual - totalBudgeted;
  const adherenceIndex = actuals.length > 0 ? ((linesOnBudget + linesUnderBudget) / actuals.length) * 100 : 100;
  
  let riskLevel: "baixo" | "medio" | "alto" | "critico" = "baixo";
  if (burnRate > 120) riskLevel = "critico";
  else if (burnRate > 110) riskLevel = "alto";
  else if (burnRate > 100) riskLevel = "medio";
  
  // Inserir ou atualizar indicadores
  const existing = await db.select().from(budgetIndicators)
    .where(and(
      eq(budgetIndicators.budgetId, budgetId),
      eq(budgetIndicators.month, month),
      eq(budgetIndicators.year, year)
    ));
  
  const indicatorData = {
    budgetId,
    month,
    year,
    burnRate: burnRate.toString(),
    runRate: runRate.toString(),
    varianceAccumulated: varianceAccumulated.toString(),
    adherenceIndex: adherenceIndex.toString(),
    linesOnBudget,
    linesOverBudget,
    linesUnderBudget,
    projectedYearEnd: runRate.toString(),
    projectedVariance: (runRate - totalBudgeted * 12 / month).toString(),
    riskLevel,
  };
  
  if (existing.length > 0) {
    await db.update(budgetIndicators).set(indicatorData).where(eq(budgetIndicators.id, existing[0].id));
  } else {
    await db.insert(budgetIndicators).values(indicatorData);
  }
  
  return indicatorData;
}

export async function getIndicators(budgetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(budgetIndicators)
    .where(eq(budgetIndicators.budgetId, budgetId))
    .orderBy(desc(budgetIndicators.year), desc(budgetIndicators.month));
}

// ============================================================================
// BUDGET REVISIONS - Histórico de Revisões
// ============================================================================

export async function createRevision(data: InsertBudgetRevision) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(budgetRevisions).values(data);
  return { id: result[0].insertId };
}

export async function getRevisions(budgetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(budgetRevisions)
    .where(eq(budgetRevisions.budgetId, budgetId))
    .orderBy(desc(budgetRevisions.createdAt));
}

// ============================================================================
// BUDGET AI INSIGHTS - Alertas e Insights da IA
// ============================================================================

export async function createAiInsight(data: InsertBudgetAiInsight) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(budgetAiInsights).values(data);
  return { id: result[0].insertId };
}

export async function getAiInsights(budgetId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(budgetAiInsights)
      .where(and(
        eq(budgetAiInsights.budgetId, budgetId),
        eq(budgetAiInsights.status, status as any)
      ))
      .orderBy(desc(budgetAiInsights.createdAt));
  }
  return db.select().from(budgetAiInsights)
    .where(eq(budgetAiInsights.budgetId, budgetId))
    .orderBy(desc(budgetAiInsights.createdAt));
}

export async function resolveInsight(insightId: number, userId: number, resolution: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(budgetAiInsights).set({
    status: "resolvido",
    resolvedBy: userId,
    resolvedAt: new Date(),
    resolution,
  }).where(eq(budgetAiInsights.id, insightId));
  return { success: true };
}

export async function generateBudgetInsights(budgetId: number) {
  const db = await getDb();
  if (!db) return [];
  const budget = await getBudgetById(budgetId);
  if (!budget) return [];
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const indicators = await getIndicators(budgetId);
  const latestIndicator = indicators[0];
  
  const insights: InsertBudgetAiInsight[] = [];
  
  if (latestIndicator) {
    // Alerta de estouro de orçamento
    if (Number(latestIndicator.burnRate) > 100) {
      insights.push({
        budgetId,
        type: "alerta",
        severity: Number(latestIndicator.burnRate) > 110 ? "critical" : "warning",
        title: `Orçamento ${Number(latestIndicator.burnRate).toFixed(1)}% consumido`,
        description: `O orçamento está sendo consumido mais rápido que o planejado. Burn Rate atual: ${Number(latestIndicator.burnRate).toFixed(1)}%`,
        actionSuggested: "Revisar despesas e identificar oportunidades de redução de custos",
      });
    }
    
    // Previsão de estouro
    if (Number(latestIndicator.projectedVariance) > 0) {
      insights.push({
        budgetId,
        type: "previsao",
        severity: "warning",
        title: "Projeção de estouro no fechamento do ano",
        description: `Baseado na tendência atual, o orçamento será excedido em R$ ${Number(latestIndicator.projectedVariance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        actionSuggested: "Implementar medidas de contenção de despesas",
        potentialSavings: latestIndicator.projectedVariance,
      });
    }
    
    // Sugestão de otimização
    if (latestIndicator.linesOverBudget && latestIndicator.linesOverBudget > 3) {
      insights.push({
        budgetId,
        type: "sugestao",
        severity: "info",
        title: `${latestIndicator.linesOverBudget} linhas acima do orçado`,
        description: "Múltiplas categorias estão acima do orçamento. Considere realocar recursos de categorias com folga.",
        actionSuggested: "Analisar possibilidade de realocação entre centros de custo",
      });
    }
  }
  
  // Inserir insights
  for (const insight of insights) {
    await createAiInsight(insight);
  }
  
  return insights;
}

// ============================================================================
// IMPORTAÇÃO DE HISTÓRICO
// ============================================================================

export async function importFromPreviousYear(budgetId: number, baseYear: number, adjustmentPercent: number) {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };
  
  // Buscar orçamento do ano anterior
  const previousBudgets = await db.select().from(budgets)
    .where(and(
      eq(budgets.year, baseYear),
      eq(budgets.status, "aprovado")
    ));
  
  if (previousBudgets.length === 0) {
    return { success: false, message: "Nenhum orçamento aprovado encontrado para o ano base" };
  }
  
  const previousBudget = previousBudgets[0];
  const previousLines = await getBudgetLines(previousBudget.id);
  
  // Copiar linhas com ajuste percentual
  const multiplier = 1 + (adjustmentPercent / 100);
  
  for (const line of previousLines) {
    await createBudgetLine({
      budgetId,
      costCenter: line.costCenter,
      category: line.category,
      isCapex: line.isCapex,
      description: line.description,
      jan: (Number(line.jan) * multiplier).toString(),
      fev: (Number(line.fev) * multiplier).toString(),
      mar: (Number(line.mar) * multiplier).toString(),
      abr: (Number(line.abr) * multiplier).toString(),
      mai: (Number(line.mai) * multiplier).toString(),
      jun: (Number(line.jun) * multiplier).toString(),
      jul: (Number(line.jul) * multiplier).toString(),
      ago: (Number(line.ago) * multiplier).toString(),
      set: (Number(line.set) * multiplier).toString(),
      out: (Number(line.out) * multiplier).toString(),
      nov: (Number(line.nov) * multiplier).toString(),
      dez: (Number(line.dez) * multiplier).toString(),
      priority: line.priority,
    });
  }
  
  // Atualizar orçamento com informação do ano base
  await db.update(budgets).set({
    baseYear,
    adjustmentPercent: adjustmentPercent.toString(),
  }).where(eq(budgets.id, budgetId));
  
  return { success: true, linesImported: previousLines.length };
}

// ============================================================================
// DASHBOARD E ESTATÍSTICAS
// ============================================================================

export async function getBudgetDashboard(budgetId: number) {
  const db = await getDb();
  if (!db) return null;
  const budget = await getBudgetById(budgetId);
  if (!budget) return null;
  
  const lines = await getBudgetLines(budgetId);
  const indicators = await getIndicators(budgetId);
  const insights = await getAiInsights(budgetId, "novo");
  const approvals = await getApprovalStatus(budgetId);
  
  // Calcular totais por centro de custo
  const byCostCenter: Record<string, { budgeted: number; actual: number }> = {};
  for (const line of lines) {
    if (!byCostCenter[line.costCenter]) {
      byCostCenter[line.costCenter] = { budgeted: 0, actual: 0 };
    }
    byCostCenter[line.costCenter].budgeted += Number(line.totalYear);
  }
  
  // Calcular totais por categoria (receita vs despesa vs investimento)
  let totalReceita = 0;
  let totalDespesa = 0;
  let totalInvestimento = 0;
  
  for (const line of lines) {
    const total = Number(line.totalYear);
    if (line.category.startsWith("receita_")) totalReceita += total;
    else if (line.category.startsWith("investimento_")) totalInvestimento += total;
    else totalDespesa += total;
  }
  
  return {
    budget,
    summary: {
      totalReceita,
      totalDespesa,
      totalInvestimento,
      resultado: totalReceita - totalDespesa - totalInvestimento,
    },
    byCostCenter,
    latestIndicator: indicators[0] || null,
    pendingInsights: insights.length,
    approvalStatus: approvals,
    linesCount: lines.length,
  };
}
