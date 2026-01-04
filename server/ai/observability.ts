/**
 * Módulo de Observabilidade para o Copiloto IA
 * - Logs de latência e erros
 * - Métricas: insights/dia, erros provider, uso por perfil
 * - Dashboard de métricas
 */

import { getDb } from "../db";
import { aiInsights, aiConversations, aiMessages } from "../../drizzle/schema";
import { sql, gte, and, eq, count } from "drizzle-orm";

// ============================================
// TIPOS
// ============================================

export interface MetricPoint {
  name: string;
  value: number;
  timestamp: Date;
  labels: Record<string, string>;
}

export interface LatencyLog {
  endpoint: string;
  method: string;
  durationMs: number;
  statusCode: number;
  userId?: number;
  userRole?: string;
  timestamp: Date;
  error?: string;
}

export interface ErrorLog {
  type: string;
  message: string;
  stack?: string;
  endpoint?: string;
  userId?: number;
  timestamp: Date;
  context?: Record<string, unknown>;
}

export interface UsageStats {
  totalConversations: number;
  totalMessages: number;
  totalInsights: number;
  insightsToday: number;
  insightsByType: Record<string, number>;
  insightsBySeverity: Record<string, number>;
  usageByRole: Record<string, number>;
  avgResponseTimeMs: number;
  errorRate: number;
  activeUsers: number;
}

// ============================================
// ARMAZENAMENTO EM MEMÓRIA (para métricas em tempo real)
// ============================================

const metricsStore: MetricPoint[] = [];
const latencyLogs: LatencyLog[] = [];
const errorLogs: ErrorLog[] = [];

// Limites de armazenamento
const MAX_METRICS = 10000;
const MAX_LATENCY_LOGS = 5000;
const MAX_ERROR_LOGS = 1000;

// ============================================
// MÉTRICAS
// ============================================

/**
 * Registra uma métrica
 */
export function recordMetric(
  name: string,
  value: number,
  labels: Record<string, string> = {}
): void {
  const metric: MetricPoint = {
    name,
    value,
    timestamp: new Date(),
    labels
  };
  
  metricsStore.push(metric);
  
  // Limpar métricas antigas se exceder limite
  if (metricsStore.length > MAX_METRICS) {
    metricsStore.splice(0, metricsStore.length - MAX_METRICS);
  }
}

/**
 * Incrementa um contador
 */
export function incrementCounter(
  name: string,
  labels: Record<string, string> = {},
  increment: number = 1
): void {
  recordMetric(name, increment, labels);
}

/**
 * Registra um histograma (latência, tamanho, etc.)
 */
export function recordHistogram(
  name: string,
  value: number,
  labels: Record<string, string> = {}
): void {
  recordMetric(name, value, labels);
}

/**
 * Obtém soma de métricas por nome e labels
 */
export function getMetricSum(
  name: string,
  labels?: Record<string, string>,
  since?: Date
): number {
  return metricsStore
    .filter(m => {
      if (m.name !== name) return false;
      if (since && m.timestamp < since) return false;
      if (labels) {
        for (const [key, value] of Object.entries(labels)) {
          if (m.labels[key] !== value) return false;
        }
      }
      return true;
    })
    .reduce((sum, m) => sum + m.value, 0);
}

/**
 * Obtém média de métricas por nome e labels
 */
export function getMetricAvg(
  name: string,
  labels?: Record<string, string>,
  since?: Date
): number {
  const filtered = metricsStore.filter(m => {
    if (m.name !== name) return false;
    if (since && m.timestamp < since) return false;
    if (labels) {
      for (const [key, value] of Object.entries(labels)) {
        if (m.labels[key] !== value) return false;
      }
    }
    return true;
  });
  
  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, m) => sum + m.value, 0) / filtered.length;
}

// ============================================
// LOGS DE LATÊNCIA
// ============================================

/**
 * Registra log de latência de requisição
 */
export function logLatency(log: Omit<LatencyLog, "timestamp">): void {
  const entry: LatencyLog = {
    ...log,
    timestamp: new Date()
  };
  
  latencyLogs.push(entry);
  
  // Registrar como métrica também
  recordHistogram("ai_request_latency_ms", log.durationMs, {
    endpoint: log.endpoint,
    method: log.method,
    status: String(log.statusCode)
  });
  
  // Limpar logs antigos
  if (latencyLogs.length > MAX_LATENCY_LOGS) {
    latencyLogs.splice(0, latencyLogs.length - MAX_LATENCY_LOGS);
  }
}

/**
 * Obtém logs de latência
 */
export function getLatencyLogs(filters?: {
  endpoint?: string;
  minDurationMs?: number;
  since?: Date;
  limit?: number;
}): LatencyLog[] {
  let filtered = [...latencyLogs];
  
  if (filters?.endpoint) {
    filtered = filtered.filter(l => l.endpoint === filters.endpoint);
  }
  
  if (filters?.minDurationMs) {
    filtered = filtered.filter(l => l.durationMs >= filters.minDurationMs!);
  }
  
  if (filters?.since) {
    filtered = filtered.filter(l => l.timestamp >= filters.since!);
  }
  
  // Ordenar por timestamp desc
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  if (filters?.limit) {
    filtered = filtered.slice(0, filters.limit);
  }
  
  return filtered;
}

/**
 * Obtém estatísticas de latência
 */
export function getLatencyStats(endpoint?: string, since?: Date): {
  count: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
} {
  let filtered = latencyLogs;
  
  if (endpoint) {
    filtered = filtered.filter(l => l.endpoint === endpoint);
  }
  
  if (since) {
    filtered = filtered.filter(l => l.timestamp >= since);
  }
  
  if (filtered.length === 0) {
    return { count: 0, avgMs: 0, minMs: 0, maxMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0 };
  }
  
  const durations = filtered.map(l => l.durationMs).sort((a, b) => a - b);
  const sum = durations.reduce((a, b) => a + b, 0);
  
  return {
    count: durations.length,
    avgMs: Math.round(sum / durations.length),
    minMs: durations[0],
    maxMs: durations[durations.length - 1],
    p50Ms: durations[Math.floor(durations.length * 0.5)],
    p95Ms: durations[Math.floor(durations.length * 0.95)],
    p99Ms: durations[Math.floor(durations.length * 0.99)]
  };
}

// ============================================
// LOGS DE ERRO
// ============================================

/**
 * Registra log de erro
 */
export function logError(log: Omit<ErrorLog, "timestamp">): void {
  const entry: ErrorLog = {
    ...log,
    timestamp: new Date()
  };
  
  errorLogs.push(entry);
  
  // Registrar como métrica
  incrementCounter("ai_errors", { type: log.type, endpoint: log.endpoint || "unknown" });
  
  // Limpar logs antigos
  if (errorLogs.length > MAX_ERROR_LOGS) {
    errorLogs.splice(0, errorLogs.length - MAX_ERROR_LOGS);
  }
}

/**
 * Obtém logs de erro
 */
export function getErrorLogs(filters?: {
  type?: string;
  since?: Date;
  limit?: number;
}): ErrorLog[] {
  let filtered = [...errorLogs];
  
  if (filters?.type) {
    filtered = filtered.filter(e => e.type === filters.type);
  }
  
  if (filters?.since) {
    filtered = filtered.filter(e => e.timestamp >= filters.since!);
  }
  
  // Ordenar por timestamp desc
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  if (filters?.limit) {
    filtered = filtered.slice(0, filters.limit);
  }
  
  return filtered;
}

/**
 * Obtém contagem de erros por tipo
 */
export function getErrorCounts(since?: Date): Record<string, number> {
  let filtered = errorLogs;
  
  if (since) {
    filtered = filtered.filter(e => e.timestamp >= since);
  }
  
  const counts: Record<string, number> = {};
  for (const error of filtered) {
    counts[error.type] = (counts[error.type] || 0) + 1;
  }
  
  return counts;
}

// ============================================
// ESTATÍSTICAS DE USO DO BANCO
// ============================================

/**
 * Obtém estatísticas de uso do Copiloto IA
 */
export async function getUsageStats(): Promise<UsageStats> {
  const db = await getDb();
  if (!db) {
    return {
      totalConversations: 0,
      totalMessages: 0,
      totalInsights: 0,
      insightsToday: 0,
      insightsByType: {},
      insightsBySeverity: {},
      usageByRole: {},
      avgResponseTimeMs: 0,
      errorRate: 0,
      activeUsers: 0
    };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Total de conversas
  const [convCount] = await db.select({ count: count() }).from(aiConversations);
  
  // Total de mensagens
  const [msgCount] = await db.select({ count: count() }).from(aiMessages);
  
  // Total de insights
  const [insightCount] = await db.select({ count: count() }).from(aiInsights);
  
  // Insights hoje
  const [insightsTodayCount] = await db.select({ count: count() })
    .from(aiInsights)
    .where(gte(aiInsights.generatedAt, today));
  
  // Insights por tipo
  const insightsByTypeResult = await db.select({
    type: aiInsights.insightType,
    count: count()
  })
    .from(aiInsights)
    .groupBy(aiInsights.insightType);
  
  const insightsByType: Record<string, number> = {};
  for (const row of insightsByTypeResult) {
    insightsByType[row.type] = row.count;
  }
  
  // Insights por severidade
  const insightsBySeverityResult = await db.select({
    severity: aiInsights.severity,
    count: count()
  })
    .from(aiInsights)
    .groupBy(aiInsights.severity);
  
  const insightsBySeverity: Record<string, number> = {};
  for (const row of insightsBySeverityResult) {
    insightsBySeverity[row.severity] = row.count;
  }
  
  // Uso por role (das métricas em memória)
  const usageByRole: Record<string, number> = {};
  for (const metric of metricsStore) {
    if (metric.name === "ai_request" && metric.labels.role) {
      usageByRole[metric.labels.role] = (usageByRole[metric.labels.role] || 0) + metric.value;
    }
  }
  
  // Latência média
  const latencyStats = getLatencyStats();
  
  // Taxa de erro
  const totalRequests = getMetricSum("ai_request");
  const totalErrors = getMetricSum("ai_errors");
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  
  // Usuários ativos (últimas 24h)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const [activeUsersCount] = await db.select({ count: sql<number>`COUNT(DISTINCT ${aiConversations.userId})` })
    .from(aiConversations)
    .where(gte(aiConversations.updatedAt, yesterday));
  
  return {
    totalConversations: convCount.count,
    totalMessages: msgCount.count,
    totalInsights: insightCount.count,
    insightsToday: insightsTodayCount.count,
    insightsByType,
    insightsBySeverity,
    usageByRole,
    avgResponseTimeMs: latencyStats.avgMs,
    errorRate: Math.round(errorRate * 100) / 100,
    activeUsers: activeUsersCount.count
  };
}

/**
 * Obtém insights por dia (últimos N dias)
 */
export async function getInsightsPerDay(days: number = 30): Promise<{ date: string; count: number }[]> {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const results = await db.select({
    date: sql<string>`DATE(${aiInsights.generatedAt})`,
    count: count()
  })
    .from(aiInsights)
    .where(gte(aiInsights.generatedAt, startDate))
    .groupBy(sql`DATE(${aiInsights.generatedAt})`)
    .orderBy(sql`DATE(${aiInsights.generatedAt})`);
  
  return results.map(r => ({
    date: String(r.date),
    count: r.count
  }));
}

/**
 * Obtém erros do provider por dia
 */
export function getProviderErrorsPerDay(days: number = 7): { date: string; count: number }[] {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const errorsByDay: Record<string, number> = {};
  
  for (const error of errorLogs) {
    if (error.timestamp < startDate) continue;
    if (!error.type.includes("provider")) continue;
    
    const dateStr = error.timestamp.toISOString().split("T")[0];
    errorsByDay[dateStr] = (errorsByDay[dateStr] || 0) + 1;
  }
  
  return Object.entries(errorsByDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================
// MIDDLEWARE DE OBSERVABILIDADE
// ============================================

/**
 * Wrapper para medir latência de funções async
 */
export async function withLatencyTracking<T>(
  endpoint: string,
  method: string,
  userId: number | undefined,
  userRole: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let statusCode = 200;
  let error: string | undefined;
  
  try {
    const result = await fn();
    return result;
  } catch (err) {
    statusCode = 500;
    error = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const durationMs = Date.now() - startTime;
    logLatency({
      endpoint,
      method,
      durationMs,
      statusCode,
      userId,
      userRole,
      error
    });
  }
}

/**
 * Registra uso do Copiloto por role
 */
export function trackUsage(userId: number, userRole: string, endpoint: string): void {
  incrementCounter("ai_request", { role: userRole, endpoint, userId: String(userId) });
}

// ============================================
// DASHBOARD DE MÉTRICAS
// ============================================

export interface MetricsDashboard {
  overview: {
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    avgLatencyMs: number;
  };
  latency: {
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  insights: {
    total: number;
    today: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  usage: {
    byRole: Record<string, number>;
    activeUsers: number;
  };
  errors: {
    byType: Record<string, number>;
    recent: ErrorLog[];
  };
}

/**
 * Obtém dashboard completo de métricas
 */
export async function getMetricsDashboard(): Promise<MetricsDashboard> {
  const usageStats = await getUsageStats();
  const latencyStats = getLatencyStats();
  const errorCounts = getErrorCounts();
  const recentErrors = getErrorLogs({ limit: 10 });
  
  const totalRequests = getMetricSum("ai_request");
  const totalErrors = getMetricSum("ai_errors");
  
  return {
    overview: {
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 10000) / 100 : 0,
      avgLatencyMs: latencyStats.avgMs
    },
    latency: {
      p50Ms: latencyStats.p50Ms,
      p95Ms: latencyStats.p95Ms,
      p99Ms: latencyStats.p99Ms
    },
    insights: {
      total: usageStats.totalInsights,
      today: usageStats.insightsToday,
      byType: usageStats.insightsByType,
      bySeverity: usageStats.insightsBySeverity
    },
    usage: {
      byRole: usageStats.usageByRole,
      activeUsers: usageStats.activeUsers
    },
    errors: {
      byType: errorCounts,
      recent: recentErrors
    }
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Métricas
  recordMetric,
  incrementCounter,
  recordHistogram,
  getMetricSum,
  getMetricAvg,
  
  // Latência
  logLatency,
  getLatencyLogs,
  getLatencyStats,
  
  // Erros
  logError,
  getErrorLogs,
  getErrorCounts,
  
  // Estatísticas
  getUsageStats,
  getInsightsPerDay,
  getProviderErrorsPerDay,
  
  // Middleware
  withLatencyTracking,
  trackUsage,
  
  // Dashboard
  getMetricsDashboard
};
