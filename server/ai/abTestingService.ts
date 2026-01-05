/**
 * A/B Testing Service - Framework de testes A/B para o Copiloto IA
 * Bloco 8/9 - Testes A/B e monitoramento contínuo
 */

import { getDb } from "../db";
import { aiAbExperiments, auditLogs } from "../../drizzle/schema";
import { eq, and, desc, count } from "drizzle-orm";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type ExperimentStatus = "draft" | "running" | "paused" | "completed" | "cancelled";
export type Variant = "control" | "treatment";

export interface CreateExperimentParams {
  name: string;
  description?: string;
  feature: string;
  controlConfig: Record<string, unknown>;
  treatmentConfig: Record<string, unknown>;
  primaryMetric: string;
  secondaryMetrics?: string[];
  trafficAllocation?: number;
  createdBy: number;
}

export interface ExperimentResult {
  experimentId: string;
  name: string;
  status: ExperimentStatus;
  controlSampleSize: number;
  treatmentSampleSize: number;
  controlMetricValue: number | null;
  treatmentMetricValue: number | null;
  statisticalSignificance: number | null;
  winner: Variant | "inconclusive" | null;
  improvement: number | null;
}

// ============================================================================
// CRIAÇÃO E GERENCIAMENTO DE EXPERIMENTOS
// ============================================================================

/**
 * Cria um novo experimento A/B
 */
export async function createExperiment(params: CreateExperimentParams): Promise<{ experimentId: string; success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Gerar ID único para o experimento
  const experimentId = `exp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  await db.insert(aiAbExperiments).values({
    experimentId,
    name: params.name,
    description: params.description,
    feature: params.feature,
    controlConfig: params.controlConfig,
    treatmentConfig: params.treatmentConfig,
    primaryMetric: params.primaryMetric,
    secondaryMetrics: params.secondaryMetrics || [],
    trafficAllocation: (params.trafficAllocation || 0.5).toFixed(2),
    status: "draft",
    createdBy: params.createdBy,
  });

  // Log de auditoria
  await db.insert(auditLogs).values({
    userId: params.createdBy,
    userName: "system",
    action: "experiment_created",
    module: "ab_testing",
    entityType: "ai_ab_experiments",
    entityId: 0,
    details: { experimentId, name: params.name, feature: params.feature },
    ipAddress: "system",
    userAgent: "ABTestingService",
  });

  return { experimentId, success: true };
}

/**
 * Inicia um experimento A/B
 */
export async function startExperiment(experimentId: string, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(aiAbExperiments)
    .set({
      status: "running",
      startedAt: new Date(),
    })
    .where(eq(aiAbExperiments.experimentId, experimentId));

  await db.insert(auditLogs).values({
    userId,
    userName: "system",
    action: "experiment_started",
    module: "ab_testing",
    entityType: "ai_ab_experiments",
    entityId: 0,
    details: { experimentId },
    ipAddress: "system",
    userAgent: "ABTestingService",
  });

  return true;
}

/**
 * Pausa um experimento A/B
 */
export async function pauseExperiment(experimentId: string, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(aiAbExperiments)
    .set({ status: "paused" })
    .where(eq(aiAbExperiments.experimentId, experimentId));

  await db.insert(auditLogs).values({
    userId,
    userName: "system",
    action: "experiment_paused",
    module: "ab_testing",
    entityType: "ai_ab_experiments",
    entityId: 0,
    details: { experimentId },
    ipAddress: "system",
    userAgent: "ABTestingService",
  });

  return true;
}

/**
 * Finaliza um experimento A/B e determina o vencedor
 */
export async function completeExperiment(
  experimentId: string,
  userId: number
): Promise<ExperimentResult | null> {
  const db = await getDb();
  if (!db) return null;

  const [experiment] = await db
    .select()
    .from(aiAbExperiments)
    .where(eq(aiAbExperiments.experimentId, experimentId));

  if (!experiment) return null;

  // Calcular significância estatística (simplificado)
  const controlValue = Number(experiment.controlMetricValue) || 0;
  const treatmentValue = Number(experiment.treatmentMetricValue) || 0;
  const controlSize = experiment.controlSampleSize || 0;
  const treatmentSize = experiment.treatmentSampleSize || 0;

  let winner: Variant | "inconclusive" = "inconclusive";
  let statisticalSignificance = 0;
  let improvement: number | null = null;

  if (controlSize >= 30 && treatmentSize >= 30) {
    // Cálculo simplificado de significância
    const diff = Math.abs(treatmentValue - controlValue);
    const pooledStdDev = Math.sqrt(
      (controlValue * (1 - controlValue) / controlSize) +
      (treatmentValue * (1 - treatmentValue) / treatmentSize)
    );
    
    if (pooledStdDev > 0) {
      const zScore = diff / pooledStdDev;
      statisticalSignificance = Math.min(0.99, 1 - Math.exp(-zScore));
    }

    if (statisticalSignificance >= 0.95) {
      winner = treatmentValue > controlValue ? "treatment" : "control";
      improvement = controlValue > 0 
        ? ((treatmentValue - controlValue) / controlValue) * 100 
        : null;
    }
  }

  // Atualizar experimento
  await db
    .update(aiAbExperiments)
    .set({
      status: "completed",
      endedAt: new Date(),
      statisticalSignificance: statisticalSignificance.toFixed(4),
      winner,
    })
    .where(eq(aiAbExperiments.experimentId, experimentId));

  // Log de auditoria
  await db.insert(auditLogs).values({
    userId,
    userName: "system",
    action: "experiment_completed",
    module: "ab_testing",
    entityType: "ai_ab_experiments",
    entityId: 0,
    details: { experimentId, winner, statisticalSignificance },
    ipAddress: "system",
    userAgent: "ABTestingService",
  });

  return {
    experimentId,
    name: experiment.name,
    status: "completed",
    controlSampleSize: controlSize,
    treatmentSampleSize: treatmentSize,
    controlMetricValue: controlValue,
    treatmentMetricValue: treatmentValue,
    statisticalSignificance,
    winner,
    improvement,
  };
}

// ============================================================================
// ALOCAÇÃO DE USUÁRIOS
// ============================================================================

/**
 * Determina a variante para um usuário em um experimento
 * Usa hash determinístico para consistência
 */
export function getUserVariant(
  experimentId: string,
  userId: number,
  trafficAllocation: number
): Variant {
  // Hash simples para determinismo
  const hash = hashCode(`${experimentId}:${userId}`);
  const bucket = Math.abs(hash) % 100;
  
  return bucket < trafficAllocation * 100 ? "treatment" : "control";
}

/**
 * Hash code simples para strings
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

// ============================================================================
// MONITORAMENTO CONTÍNUO
// ============================================================================

/**
 * Obtém métricas em tempo real de um experimento
 */
export async function getExperimentMetrics(experimentId: string): Promise<{
  control: { sampleSize: number; metricValue: number; conversionRate: number };
  treatment: { sampleSize: number; metricValue: number; conversionRate: number };
  isSignificant: boolean;
  recommendedAction: string;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const [experiment] = await db
    .select()
    .from(aiAbExperiments)
    .where(eq(aiAbExperiments.experimentId, experimentId));

  if (!experiment) return null;

  const controlSize = experiment.controlSampleSize || 0;
  const treatmentSize = experiment.treatmentSampleSize || 0;
  const controlValue = Number(experiment.controlMetricValue) || 0;
  const treatmentValue = Number(experiment.treatmentMetricValue) || 0;

  // Verificar significância
  const isSignificant = Number(experiment.statisticalSignificance) >= 0.95;

  // Determinar recomendação
  let recommendedAction = "Continuar coletando dados";
  
  if (controlSize + treatmentSize < 100) {
    recommendedAction = "Amostra insuficiente (mínimo 100 total)";
  } else if (isSignificant) {
    if (treatmentValue > controlValue) {
      recommendedAction = "Implementar variante Treatment";
    } else {
      recommendedAction = "Manter variante Control";
    }
  } else if (controlSize + treatmentSize > 1000) {
    recommendedAction = "Considerar encerrar - diferença não significativa";
  }

  return {
    control: {
      sampleSize: controlSize,
      metricValue: controlValue,
      conversionRate: controlValue,
    },
    treatment: {
      sampleSize: treatmentSize,
      metricValue: treatmentValue,
      conversionRate: treatmentValue,
    },
    isSignificant,
    recommendedAction,
  };
}

/**
 * Lista experimentos ativos
 */
export async function listActiveExperiments(): Promise<Array<{
  experimentId: string;
  name: string;
  feature: string;
  status: ExperimentStatus;
  startedAt: Date | null;
  sampleSize: number;
}>> {
  const db = await getDb();
  if (!db) return [];

  const experiments = await db
    .select()
    .from(aiAbExperiments)
    .where(eq(aiAbExperiments.status, "running"))
    .orderBy(desc(aiAbExperiments.startedAt));

  return experiments.map((e) => ({
    experimentId: e.experimentId,
    name: e.name,
    feature: e.feature,
    status: e.status,
    startedAt: e.startedAt,
    sampleSize: (e.controlSampleSize || 0) + (e.treatmentSampleSize || 0),
  }));
}

/**
 * Obtém configuração de feature para um usuário baseado em experimentos ativos
 */
export async function getFeatureConfig(
  feature: string,
  userId: number
): Promise<{ config: Record<string, unknown>; experimentId?: string; variant?: Variant }> {
  const db = await getDb();
  if (!db) return { config: {} };

  // Buscar experimento ativo para esta feature
  const [experiment] = await db
    .select()
    .from(aiAbExperiments)
    .where(
      and(
        eq(aiAbExperiments.feature, feature),
        eq(aiAbExperiments.status, "running")
      )
    );

  if (!experiment) {
    return { config: {} };
  }

  // Determinar variante do usuário
  const trafficAllocation = Number(experiment.trafficAllocation) || 0.5;
  const variant = getUserVariant(experiment.experimentId, userId, trafficAllocation);

  // Retornar configuração apropriada
  const config = variant === "treatment"
    ? (experiment.treatmentConfig as Record<string, unknown>)
    : (experiment.controlConfig as Record<string, unknown>);

  return {
    config,
    experimentId: experiment.experimentId,
    variant,
  };
}

// ============================================================================
// EXPERIMENTOS PRÉ-DEFINIDOS
// ============================================================================

/**
 * Experimentos padrão para o Copiloto IA
 */
export const PREDEFINED_EXPERIMENTS = {
  CHAT_RESPONSE_FORMAT: {
    name: "Formato de Resposta do Chat",
    feature: "chat_response_format",
    controlConfig: {
      useMarkdown: true,
      showSources: true,
      maxLength: 500,
    },
    treatmentConfig: {
      useMarkdown: true,
      showSources: true,
      maxLength: 800,
      showConfidence: true,
    },
    primaryMetric: "satisfaction_rate",
  },
  INSIGHT_THRESHOLD: {
    name: "Threshold de Insights",
    feature: "insight_threshold",
    controlConfig: {
      criticalThreshold: 0.9,
      highThreshold: 0.7,
      mediumThreshold: 0.5,
    },
    treatmentConfig: {
      criticalThreshold: 0.85,
      highThreshold: 0.65,
      mediumThreshold: 0.45,
    },
    primaryMetric: "insight_accuracy",
  },
  FEEDBACK_TIMING: {
    name: "Timing do Feedback",
    feature: "feedback_timing",
    controlConfig: {
      showAfterResponse: true,
      delayMs: 0,
      required: false,
    },
    treatmentConfig: {
      showAfterResponse: true,
      delayMs: 2000,
      required: true,
    },
    primaryMetric: "feedback_rate",
  },
};

// ============================================================================
// FIM DO MÓDULO
// ============================================================================
