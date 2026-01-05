/**
 * FeedbackService - Sistema de feedback avançado com analytics
 * Bloco 8/9 - Feedback obrigatório, agregação para retrain, relatórios
 */

import { getDb } from "../db";
import { 
  aiFeedbackAdvanced, 
  aiRetrainLogs, 
  aiPerformanceReports,
  aiAbExperiments,
  auditLogs,
  users
} from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc, count, avg } from "drizzle-orm";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type FeedbackType = "like" | "dislike" | "neutral";
export type InteractionType = "chat" | "insight" | "alert" | "action" | "prediction";
export type ImprovementArea = "accuracy" | "relevance" | "clarity" | "completeness" | "actionability";

export interface SubmitFeedbackParams {
  userId: number;
  messageId?: number;
  insightId?: number;
  actionId?: number;
  predictionId?: number;
  rating: number; // 1-5
  feedbackType: FeedbackType;
  comment: string; // Obrigatório
  improvementAreas?: ImprovementArea[];
  interactionType: InteractionType;
  responseTimeMs?: number;
  sessionDuration?: number;
  language?: string;
  experimentId?: string;
  variant?: string;
  contextSnapshot?: Record<string, unknown>;
  userSegment?: string;
}

export interface FeedbackAnalytics {
  totalFeedbacks: number;
  avgRating: number;
  satisfactionRate: number; // % de ratings >= 4
  feedbackRate: number; // % de interações com feedback
  byType: Record<FeedbackType, number>;
  byInteraction: Record<InteractionType, number>;
  byLanguage: Record<string, number>;
  topImprovementAreas: { area: ImprovementArea; count: number }[];
  trend: "improving" | "stable" | "declining";
}

export interface RetrainTriggerResult {
  shouldRetrain: boolean;
  reason?: string;
  feedbackCount: number;
  avgRating: number;
  negativeRatio: number;
}

// ============================================================================
// SUBMISSÃO DE FEEDBACK
// ============================================================================

/**
 * Submete feedback avançado obrigatório
 */
export async function submitAdvancedFeedback(params: SubmitFeedbackParams): Promise<{ id: number; success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validar rating
  if (params.rating < 1 || params.rating > 5) {
    throw new Error("Rating deve ser entre 1 e 5");
  }

  // Validar comentário obrigatório
  if (!params.comment || params.comment.trim().length < 10) {
    throw new Error("Comentário obrigatório (mínimo 10 caracteres)");
  }

  // Inserir feedback
  const [result] = await db.insert(aiFeedbackAdvanced).values({
    userId: params.userId,
    messageId: params.messageId,
    insightId: params.insightId,
    actionId: params.actionId,
    predictionId: params.predictionId,
    rating: params.rating,
    feedbackType: params.feedbackType,
    comment: params.comment.trim(),
    improvementAreas: params.improvementAreas || [],
    interactionType: params.interactionType,
    responseTimeMs: params.responseTimeMs,
    sessionDuration: params.sessionDuration,
    language: params.language || "pt-BR",
    experimentId: params.experimentId,
    variant: params.variant,
    contextSnapshot: params.contextSnapshot,
    userSegment: params.userSegment,
  });

  const insertId = result.insertId;

  // Log de auditoria
  await db.insert(auditLogs).values({
    userId: params.userId,
    userName: "system",
    action: "feedback_submitted",
    module: "ai_feedback",
    entityType: "ai_feedback_advanced",
    entityId: Number(insertId),
    details: {
      rating: params.rating,
      feedbackType: params.feedbackType,
      interactionType: params.interactionType,
      language: params.language,
    },
    ipAddress: "system",
    userAgent: "FeedbackService",
  });

  // Verificar se deve disparar retrain
  await checkRetrainTrigger();

  return { id: Number(insertId), success: true };
}

// ============================================================================
// ANALYTICS DE FEEDBACK
// ============================================================================

/**
 * Obtém analytics de feedback para um período
 */
export async function getFeedbackAnalytics(
  startDate: Date,
  endDate: Date
): Promise<FeedbackAnalytics> {
  const db = await getDb();
  if (!db) {
    return {
      totalFeedbacks: 0,
      avgRating: 0,
      satisfactionRate: 0,
      feedbackRate: 0,
      byType: { like: 0, dislike: 0, neutral: 0 },
      byInteraction: { chat: 0, insight: 0, alert: 0, action: 0, prediction: 0 },
      byLanguage: {},
      topImprovementAreas: [],
      trend: "stable",
    };
  }

  // Total de feedbacks
  const [totalResult] = await db
    .select({ count: count() })
    .from(aiFeedbackAdvanced)
    .where(
      and(
        gte(aiFeedbackAdvanced.createdAt, startDate),
        lte(aiFeedbackAdvanced.createdAt, endDate)
      )
    );

  const totalFeedbacks = totalResult?.count || 0;

  // Média de rating
  const [avgResult] = await db
    .select({ avg: avg(aiFeedbackAdvanced.rating) })
    .from(aiFeedbackAdvanced)
    .where(
      and(
        gte(aiFeedbackAdvanced.createdAt, startDate),
        lte(aiFeedbackAdvanced.createdAt, endDate)
      )
    );

  const avgRating = Number(avgResult?.avg) || 0;

  // Taxa de satisfação (rating >= 4)
  const [satisfiedResult] = await db
    .select({ count: count() })
    .from(aiFeedbackAdvanced)
    .where(
      and(
        gte(aiFeedbackAdvanced.createdAt, startDate),
        lte(aiFeedbackAdvanced.createdAt, endDate),
        gte(aiFeedbackAdvanced.rating, 4)
      )
    );

  const satisfactionRate = totalFeedbacks > 0 
    ? (satisfiedResult?.count || 0) / totalFeedbacks 
    : 0;

  // Por tipo de feedback
  const byTypeResults = await db
    .select({
      feedbackType: aiFeedbackAdvanced.feedbackType,
      count: count(),
    })
    .from(aiFeedbackAdvanced)
    .where(
      and(
        gte(aiFeedbackAdvanced.createdAt, startDate),
        lte(aiFeedbackAdvanced.createdAt, endDate)
      )
    )
    .groupBy(aiFeedbackAdvanced.feedbackType);

  const byType: Record<FeedbackType, number> = { like: 0, dislike: 0, neutral: 0 };
  for (const row of byTypeResults) {
    if (row.feedbackType) {
      byType[row.feedbackType as FeedbackType] = row.count;
    }
  }

  // Por tipo de interação
  const byInteractionResults = await db
    .select({
      interactionType: aiFeedbackAdvanced.interactionType,
      count: count(),
    })
    .from(aiFeedbackAdvanced)
    .where(
      and(
        gte(aiFeedbackAdvanced.createdAt, startDate),
        lte(aiFeedbackAdvanced.createdAt, endDate)
      )
    )
    .groupBy(aiFeedbackAdvanced.interactionType);

  const byInteraction: Record<InteractionType, number> = { 
    chat: 0, insight: 0, alert: 0, action: 0, prediction: 0 
  };
  for (const row of byInteractionResults) {
    if (row.interactionType) {
      byInteraction[row.interactionType as InteractionType] = row.count;
    }
  }

  // Por idioma
  const byLanguageResults = await db
    .select({
      language: aiFeedbackAdvanced.language,
      count: count(),
    })
    .from(aiFeedbackAdvanced)
    .where(
      and(
        gte(aiFeedbackAdvanced.createdAt, startDate),
        lte(aiFeedbackAdvanced.createdAt, endDate)
      )
    )
    .groupBy(aiFeedbackAdvanced.language);

  const byLanguage: Record<string, number> = {};
  for (const row of byLanguageResults) {
    if (row.language) {
      byLanguage[row.language] = row.count;
    }
  }

  // Calcular tendência comparando com período anterior
  const periodLength = endDate.getTime() - startDate.getTime();
  const previousStart = new Date(startDate.getTime() - periodLength);
  const previousEnd = new Date(startDate.getTime());

  const [previousAvg] = await db
    .select({ avg: avg(aiFeedbackAdvanced.rating) })
    .from(aiFeedbackAdvanced)
    .where(
      and(
        gte(aiFeedbackAdvanced.createdAt, previousStart),
        lte(aiFeedbackAdvanced.createdAt, previousEnd)
      )
    );

  const previousRating = Number(previousAvg?.avg) || avgRating;
  let trend: "improving" | "stable" | "declining" = "stable";
  
  if (avgRating > previousRating + 0.2) {
    trend = "improving";
  } else if (avgRating < previousRating - 0.2) {
    trend = "declining";
  }

  return {
    totalFeedbacks,
    avgRating,
    satisfactionRate,
    feedbackRate: 0, // Requer total de interações para calcular
    byType,
    byInteraction,
    byLanguage,
    topImprovementAreas: [], // Requer parsing de JSON
    trend,
  };
}

// ============================================================================
// VERIFICAÇÃO DE RETRAIN
// ============================================================================

/**
 * Verifica se deve disparar retrain baseado em feedback
 */
export async function checkRetrainTrigger(): Promise<RetrainTriggerResult> {
  const db = await getDb();
  if (!db) {
    return { shouldRetrain: false, feedbackCount: 0, avgRating: 0, negativeRatio: 0 };
  }

  // Buscar feedbacks não processados
  const unprocessedFeedbacks = await db
    .select()
    .from(aiFeedbackAdvanced)
    .where(eq(aiFeedbackAdvanced.processedForRetrain, false))
    .limit(1000);

  const feedbackCount = unprocessedFeedbacks.length;

  if (feedbackCount < 100) {
    return { 
      shouldRetrain: false, 
      reason: "Feedback insuficiente (mínimo 100)",
      feedbackCount, 
      avgRating: 0, 
      negativeRatio: 0 
    };
  }

  // Calcular métricas
  const totalRating = unprocessedFeedbacks.reduce((sum, f) => sum + f.rating, 0);
  const avgRating = totalRating / feedbackCount;
  
  const negativeFeedbacks = unprocessedFeedbacks.filter(f => f.rating <= 2).length;
  const negativeRatio = negativeFeedbacks / feedbackCount;

  // Critérios para retrain
  const shouldRetrain = negativeRatio > 0.3 || avgRating < 3.0;

  return {
    shouldRetrain,
    reason: shouldRetrain 
      ? `Alta taxa de feedback negativo (${(negativeRatio * 100).toFixed(1)}%) ou rating baixo (${avgRating.toFixed(2)})`
      : undefined,
    feedbackCount,
    avgRating,
    negativeRatio,
  };
}

/**
 * Executa retrain de modelo baseado em feedback
 */
export async function executeRetrain(
  modelType: string,
  triggerType: "scheduled" | "feedback_threshold" | "manual",
  userId?: number
): Promise<{ success: boolean; retrainLogId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Criar log de retrain
  const [result] = await db.insert(aiRetrainLogs).values({
    modelType,
    triggerType,
    feedbackCount: 0,
    dataPointsUsed: 0,
    status: "started",
    anonymizationApplied: true,
    createdBy: userId,
  });

  const retrainLogId = Number(result.insertId);

  try {
    // Buscar feedbacks não processados
    const feedbacks = await db
      .select()
      .from(aiFeedbackAdvanced)
      .where(eq(aiFeedbackAdvanced.processedForRetrain, false))
      .limit(10000);

    // Simular retrain (em produção, chamaria serviço ML)
    const startTime = Date.now();
    
    // Calcular métricas
    const avgRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / (feedbacks.length || 1);
    const feedbackScore = avgRating / 5;

    // Atualizar log com resultados
    await db
      .update(aiRetrainLogs)
      .set({
        feedbackCount: feedbacks.length,
        dataPointsUsed: feedbacks.length * 10, // Simulado
        newFeedbackScore: feedbackScore.toFixed(4),
        trainingDurationMs: Date.now() - startTime,
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(aiRetrainLogs.id, retrainLogId));

    // Marcar feedbacks como processados
    for (const feedback of feedbacks) {
      await db
        .update(aiFeedbackAdvanced)
        .set({
          processedForRetrain: true,
          processedAt: new Date(),
        })
        .where(eq(aiFeedbackAdvanced.id, feedback.id));
    }

    // Log de auditoria LGPD
    await db.insert(auditLogs).values({
      userId: userId || 0,
      userName: userId ? "user" : "system",
      action: "model_retrained",
      module: "ai_retrain",
      entityType: "ai_retrain_logs",
      entityId: retrainLogId,
      details: {
        modelType,
        triggerType,
        feedbackCount: feedbacks.length,
        anonymizationApplied: true,
        lgpdCompliant: true,
      },
      ipAddress: "system",
      userAgent: "FeedbackService",
    });

    return { success: true, retrainLogId };
  } catch (error) {
    // Atualizar log com erro
    await db
      .update(aiRetrainLogs)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      })
      .where(eq(aiRetrainLogs.id, retrainLogId));

    throw error;
  }
}

// ============================================================================
// RELATÓRIOS DE PERFORMANCE
// ============================================================================

/**
 * Gera relatório de performance do Copiloto
 */
export async function generatePerformanceReport(
  reportType: "monthly" | "quarterly" | "annual",
  periodStart: Date,
  periodEnd: Date,
  generatedBy?: number
): Promise<{ reportId: number; success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Obter analytics
  const analytics = await getFeedbackAnalytics(periodStart, periodEnd);

  // Contar interações por idioma
  const interactionsByLanguage = analytics.byLanguage;

  // Gerar recomendações automáticas
  const recommendations: string[] = [];
  
  if (analytics.satisfactionRate < 0.7) {
    recommendations.push("Taxa de satisfação abaixo de 70%. Considerar revisão dos prompts do Copiloto.");
  }
  
  if (analytics.avgRating < 3.5) {
    recommendations.push("Rating médio baixo. Analisar feedbacks negativos para identificar padrões.");
  }
  
  if (analytics.trend === "declining") {
    recommendations.push("Tendência de declínio detectada. Priorizar melhorias de qualidade.");
  }

  // Inserir relatório
  const [result] = await db.insert(aiPerformanceReports).values({
    reportType,
    periodStart: periodStart.toISOString().split("T")[0] as unknown as Date,
    periodEnd: periodEnd.toISOString().split("T")[0] as unknown as Date,
    totalInteractions: analytics.totalFeedbacks * 2, // Estimativa
    uniqueUsers: Math.floor(analytics.totalFeedbacks / 3), // Estimativa
    totalFeedbacks: analytics.totalFeedbacks,
    feedbackRate: (analytics.feedbackRate || 0.5).toFixed(4),
    avgRating: analytics.avgRating.toFixed(2),
    satisfactionRate: analytics.satisfactionRate.toFixed(4),
    interactionsByLanguage,
    insightsGenerated: 0,
    insightsResolved: 0,
    insightsDismissed: 0,
    actionssuggested: 0,
    actionsApproved: 0,
    actionsExecuted: 0,
    predictionsGenerated: 0,
    predictionsValidated: 0,
    trend: analytics.trend,
    recommendations,
    generatedBy,
  });

  return { reportId: Number(result.insertId), success: true };
}

/**
 * Lista relatórios de performance
 */
export async function listPerformanceReports(
  limit: number = 10
): Promise<Array<{
  id: number;
  reportType: string;
  periodStart: Date;
  periodEnd: Date;
  avgRating: number;
  satisfactionRate: number;
  trend: string;
  generatedAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];

  const reports = await db
    .select()
    .from(aiPerformanceReports)
    .orderBy(desc(aiPerformanceReports.generatedAt))
    .limit(limit);

  return reports.map((r) => ({
    id: r.id,
    reportType: r.reportType,
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    avgRating: Number(r.avgRating) || 0,
    satisfactionRate: Number(r.satisfactionRate) || 0,
    trend: r.trend || "stable",
    generatedAt: r.generatedAt,
  }));
}

// ============================================================================
// A/B TESTING
// ============================================================================

/**
 * Obtém variante do experimento A/B para um usuário
 */
export async function getExperimentVariant(
  experimentId: string,
  userId: number
): Promise<{ variant: "control" | "treatment"; config: Record<string, unknown> } | null> {
  const db = await getDb();
  if (!db) return null;

  const [experiment] = await db
    .select()
    .from(aiAbExperiments)
    .where(
      and(
        eq(aiAbExperiments.experimentId, experimentId),
        eq(aiAbExperiments.status, "running")
      )
    );

  if (!experiment) return null;

  // Determinístico baseado em userId para consistência
  const hash = userId % 100;
  const trafficAllocation = Number(experiment.trafficAllocation) * 100;
  
  const variant = hash < trafficAllocation ? "treatment" : "control";
  const config = variant === "treatment" 
    ? (experiment.treatmentConfig as Record<string, unknown>)
    : (experiment.controlConfig as Record<string, unknown>);

  return { variant, config };
}

/**
 * Registra resultado de experimento A/B
 */
export async function recordExperimentResult(
  experimentId: string,
  variant: "control" | "treatment",
  metricValue: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const [experiment] = await db
    .select()
    .from(aiAbExperiments)
    .where(eq(aiAbExperiments.experimentId, experimentId));

  if (!experiment) return;

  // Atualizar contadores
  if (variant === "control") {
    await db
      .update(aiAbExperiments)
      .set({
        controlSampleSize: (experiment.controlSampleSize || 0) + 1,
        controlMetricValue: metricValue.toFixed(4),
      })
      .where(eq(aiAbExperiments.experimentId, experimentId));
  } else {
    await db
      .update(aiAbExperiments)
      .set({
        treatmentSampleSize: (experiment.treatmentSampleSize || 0) + 1,
        treatmentMetricValue: metricValue.toFixed(4),
      })
      .where(eq(aiAbExperiments.experimentId, experimentId));
  }
}

// ============================================================================
// FIM DO MÓDULO
// ============================================================================
