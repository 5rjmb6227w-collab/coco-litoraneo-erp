/**
 * ObservabilityService - Monitoramento, métricas e alertas
 * Bloco 9/9 - Sentry, métricas Prometheus-style, dashboards KPI
 */

import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";
import { sql, count, avg, desc } from "drizzle-orm";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type MetricType = "counter" | "gauge" | "histogram" | "summary";
export type AlertSeverity = "info" | "warning" | "error" | "critical";

export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
  description?: string;
}

export interface MetricSeries {
  name: string;
  type: MetricType;
  values: Array<{ value: number; timestamp: number; labels?: Record<string, string> }>;
}

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  level: AlertSeverity;
  source: "frontend" | "backend" | "llm" | "integration";
  context?: Record<string, unknown>;
  userId?: number;
  sessionId?: string;
  url?: string;
  timestamp: number;
  fingerprint?: string;
  resolved?: boolean;
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface AlertConfig {
  name: string;
  metric: string;
  condition: "gt" | "lt" | "eq" | "gte" | "lte";
  threshold: number;
  severity: AlertSeverity;
  cooldownMinutes: number;
  recipients: string[];
  enabled: boolean;
}

// ============================================================================
// MÉTRICAS EM MEMÓRIA (Prometheus-style)
// ============================================================================

const metricsStore: Map<string, MetricSeries> = new Map();
const errorsStore: ErrorReport[] = [];
const performanceStore: PerformanceMetric[] = [];
const alertConfigs: AlertConfig[] = [];
const alertCooldowns: Map<string, number> = new Map();

// Limites de armazenamento
const MAX_METRIC_POINTS = 10000;
const MAX_ERRORS = 1000;
const MAX_PERFORMANCE_ENTRIES = 5000;

// ============================================================================
// MÉTRICAS - FUNÇÕES CORE
// ============================================================================

export function recordMetric(
  name: string,
  value: number,
  type: MetricType = "gauge",
  labels?: Record<string, string>
): void {
  const timestamp = Date.now();
  const key = name;

  let series = metricsStore.get(key);
  
  if (!series) {
    series = { name, type, values: [] };
    metricsStore.set(key, series);
  }

  series.values.push({ value, timestamp, labels });

  // Limitar tamanho
  if (series.values.length > MAX_METRIC_POINTS) {
    series.values = series.values.slice(-MAX_METRIC_POINTS / 2);
  }

  // Verificar alertas
  checkAlerts(name, value);
}

export function incrementCounter(name: string, labels?: Record<string, string>): void {
  const series = metricsStore.get(name);
  const currentValue = series?.values[series.values.length - 1]?.value || 0;
  recordMetric(name, currentValue + 1, "counter", labels);
}

export function setGauge(name: string, value: number, labels?: Record<string, string>): void {
  recordMetric(name, value, "gauge", labels);
}

export function recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
  recordMetric(name, value, "histogram", labels);
}

// ============================================================================
// MÉTRICAS - CONSULTAS
// ============================================================================

export function getMetric(name: string): MetricSeries | undefined {
  return metricsStore.get(name);
}

export function getMetricValue(name: string): number | undefined {
  const series = metricsStore.get(name);
  return series?.values[series.values.length - 1]?.value;
}

export function getMetricHistory(
  name: string,
  startTime?: number,
  endTime?: number
): Array<{ value: number; timestamp: number }> {
  const series = metricsStore.get(name);
  if (!series) return [];

  let values = series.values;

  if (startTime) {
    values = values.filter(v => v.timestamp >= startTime);
  }

  if (endTime) {
    values = values.filter(v => v.timestamp <= endTime);
  }

  return values.map(v => ({ value: v.value, timestamp: v.timestamp }));
}

export function getAllMetrics(): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [name, series] of Array.from(metricsStore.entries())) {
    const lastValue = series.values[series.values.length - 1];
    if (lastValue) {
      result[name] = lastValue.value;
    }
  }

  return result;
}

export function getMetricsSummary(): Array<{
  name: string;
  type: MetricType;
  currentValue: number;
  min: number;
  max: number;
  avg: number;
  count: number;
}> {
  const summaries: Array<{
    name: string;
    type: MetricType;
    currentValue: number;
    min: number;
    max: number;
    avg: number;
    count: number;
  }> = [];

  for (const [name, series] of Array.from(metricsStore.entries())) {
    const values = series.values.map(v => v.value);
    
    if (values.length === 0) continue;

    summaries.push({
      name,
      type: series.type,
      currentValue: values[values.length - 1],
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length,
    });
  }

  return summaries;
}

// ============================================================================
// ERROS - SENTRY-STYLE
// ============================================================================

export function captureError(
  error: Error | string,
  source: ErrorReport["source"] = "backend",
  context?: Record<string, unknown>,
  userId?: number
): string {
  const timestamp = Date.now();
  const id = `err_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  
  const message = typeof error === "string" ? error : error.message;
  const stack = typeof error === "string" ? undefined : error.stack;

  // Gerar fingerprint para agrupar erros similares
  const fingerprint = generateFingerprint(message, stack);

  const report: ErrorReport = {
    id,
    message,
    stack,
    level: "error",
    source,
    context,
    userId,
    timestamp,
    fingerprint,
    resolved: false,
  };

  errorsStore.push(report);

  // Limitar tamanho
  if (errorsStore.length > MAX_ERRORS) {
    errorsStore.splice(0, errorsStore.length - MAX_ERRORS / 2);
  }

  // Incrementar contador de erros
  incrementCounter(`errors_${source}_total`);
  incrementCounter(`errors_total`);

  // Log para console
  console.error(`[Sentry] Captured error (${source}): ${message}`);

  // Verificar se deve alertar
  checkErrorAlerts(report);

  return id;
}

export function captureException(
  error: Error,
  context?: Record<string, unknown>,
  userId?: number
): string {
  return captureError(error, "backend", context, userId);
}

export function captureFrontendError(
  message: string,
  stack?: string,
  url?: string,
  userId?: number
): string {
  const id = captureError(message, "frontend", { url }, userId);
  
  // Atualizar com stack se fornecido
  const report = errorsStore.find(e => e.id === id);
  if (report && stack) {
    report.stack = stack;
    report.url = url;
  }

  return id;
}

export function captureLLMError(
  message: string,
  context?: Record<string, unknown>,
  userId?: number
): string {
  return captureError(message, "llm", context, userId);
}

export function captureIntegrationError(
  message: string,
  integration: string,
  context?: Record<string, unknown>
): string {
  return captureError(message, "integration", { integration, ...context });
}

function generateFingerprint(message: string, stack?: string): string {
  // Simplificar mensagem para agrupar erros similares
  const simplified = message
    .replace(/\d+/g, "N")
    .replace(/[a-f0-9]{8,}/gi, "HASH")
    .substring(0, 100);

  return Buffer.from(simplified).toString("base64").substring(0, 20);
}

// ============================================================================
// ERROS - CONSULTAS
// ============================================================================

export function getErrors(
  options: {
    source?: ErrorReport["source"];
    level?: AlertSeverity;
    resolved?: boolean;
    limit?: number;
    startTime?: number;
    endTime?: number;
  } = {}
): ErrorReport[] {
  let filtered = [...errorsStore];

  if (options.source) {
    filtered = filtered.filter(e => e.source === options.source);
  }

  if (options.level) {
    filtered = filtered.filter(e => e.level === options.level);
  }

  if (options.resolved !== undefined) {
    filtered = filtered.filter(e => e.resolved === options.resolved);
  }

  if (options.startTime) {
    filtered = filtered.filter(e => e.timestamp >= options.startTime!);
  }

  if (options.endTime) {
    filtered = filtered.filter(e => e.timestamp <= options.endTime!);
  }

  // Ordenar por timestamp desc
  filtered.sort((a, b) => b.timestamp - a.timestamp);

  if (options.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

export function getErrorById(id: string): ErrorReport | undefined {
  return errorsStore.find(e => e.id === id);
}

export function resolveError(id: string): boolean {
  const error = errorsStore.find(e => e.id === id);
  if (error) {
    error.resolved = true;
    return true;
  }
  return false;
}

export function getErrorStats(): {
  total: number;
  bySource: Record<string, number>;
  byLevel: Record<string, number>;
  unresolvedCount: number;
  last24h: number;
} {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const bySource: Record<string, number> = {};
  const byLevel: Record<string, number> = {};
  let unresolvedCount = 0;
  let last24h = 0;

  for (const error of errorsStore) {
    bySource[error.source] = (bySource[error.source] || 0) + 1;
    byLevel[error.level] = (byLevel[error.level] || 0) + 1;
    
    if (!error.resolved) unresolvedCount++;
    if (error.timestamp >= oneDayAgo) last24h++;
  }

  return {
    total: errorsStore.length,
    bySource,
    byLevel,
    unresolvedCount,
    last24h,
  };
}

// ============================================================================
// PERFORMANCE - LATÊNCIA
// ============================================================================

export function recordLatency(
  name: string,
  durationMs: number,
  labels?: Record<string, string>
): void {
  const timestamp = Date.now();

  performanceStore.push({
    name,
    duration: durationMs,
    timestamp,
    labels,
  });

  // Limitar tamanho
  if (performanceStore.length > MAX_PERFORMANCE_ENTRIES) {
    performanceStore.splice(0, performanceStore.length - MAX_PERFORMANCE_ENTRIES / 2);
  }

  // Registrar como métrica histogram
  recordHistogram(`latency_${name}_ms`, durationMs, labels);
}

export function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  labels?: Record<string, string>
): Promise<T> {
  const start = Date.now();
  
  return fn().then(
    result => {
      recordLatency(name, Date.now() - start, labels);
      return result;
    },
    error => {
      recordLatency(name, Date.now() - start, { ...labels, error: "true" });
      throw error;
    }
  );
}

export function getLatencyStats(
  name: string,
  startTime?: number,
  endTime?: number
): {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
} {
  let entries = performanceStore.filter(p => p.name === name);

  if (startTime) {
    entries = entries.filter(p => p.timestamp >= startTime);
  }

  if (endTime) {
    entries = entries.filter(p => p.timestamp <= endTime);
  }

  if (entries.length === 0) {
    return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  }

  const durations = entries.map(e => e.duration).sort((a, b) => a - b);
  const count = durations.length;

  return {
    count,
    min: durations[0],
    max: durations[count - 1],
    avg: durations.reduce((a, b) => a + b, 0) / count,
    p50: durations[Math.floor(count * 0.5)],
    p95: durations[Math.floor(count * 0.95)],
    p99: durations[Math.floor(count * 0.99)],
  };
}

// ============================================================================
// ALERTAS AUTOMÁTICOS
// ============================================================================

export function configureAlert(config: AlertConfig): void {
  const existingIndex = alertConfigs.findIndex(a => a.name === config.name);
  
  if (existingIndex >= 0) {
    alertConfigs[existingIndex] = config;
  } else {
    alertConfigs.push(config);
  }
}

export function removeAlert(name: string): boolean {
  const index = alertConfigs.findIndex(a => a.name === name);
  if (index >= 0) {
    alertConfigs.splice(index, 1);
    return true;
  }
  return false;
}

export function getAlertConfigs(): AlertConfig[] {
  return [...alertConfigs];
}

function checkAlerts(metricName: string, value: number): void {
  const now = Date.now();

  for (const config of alertConfigs) {
    if (!config.enabled || config.metric !== metricName) continue;

    // Verificar cooldown
    const lastAlert = alertCooldowns.get(config.name);
    if (lastAlert && now - lastAlert < config.cooldownMinutes * 60 * 1000) {
      continue;
    }

    // Verificar condição
    let triggered = false;
    switch (config.condition) {
      case "gt": triggered = value > config.threshold; break;
      case "lt": triggered = value < config.threshold; break;
      case "eq": triggered = value === config.threshold; break;
      case "gte": triggered = value >= config.threshold; break;
      case "lte": triggered = value <= config.threshold; break;
    }

    if (triggered) {
      alertCooldowns.set(config.name, now);
      triggerAlert(config, metricName, value);
    }
  }
}

function checkErrorAlerts(error: ErrorReport): void {
  // Alertar para erros críticos
  if (error.level === "critical" || error.source === "llm") {
    console.log(`[Alert] Critical error detected: ${error.message}`);
    // Em produção, enviar notificação
  }
}

function triggerAlert(config: AlertConfig, metric: string, value: number): void {
  console.log(`[Alert] ${config.name}: ${metric} = ${value} (threshold: ${config.threshold})`);
  
  // Em produção, enviar via IntegrationService
  // IntegrationService.sendAlert(config.recipients, config.name, `Metric ${metric} = ${value}`);
}

// ============================================================================
// KPIs E DASHBOARDS
// ============================================================================

export interface KPIDashboard {
  timestamp: number;
  period: "day" | "week" | "month";
  metrics: {
    // Performance
    avgLatencyChat: number;
    avgLatencyInsights: number;
    avgLatencyActions: number;
    p95LatencyChat: number;
    
    // Uso
    totalRequests: number;
    requestsByModule: Record<string, number>;
    activeUsers: number;
    
    // Erros
    errorRate: number;
    errorsBySource: Record<string, number>;
    unresolvedErrors: number;
    
    // AI Copilot
    chatMessages: number;
    insightsGenerated: number;
    alertsTriggered: number;
    actionsApproved: number;
    feedbackScore: number;
    
    // Integrações
    integrationSuccessRate: number;
    whatsappMessages: number;
    zapierTriggers: number;
  };
}

export async function generateKPIDashboard(
  period: "day" | "week" | "month" = "day"
): Promise<KPIDashboard> {
  const now = Date.now();
  const periodMs = period === "day" ? 24 * 60 * 60 * 1000
    : period === "week" ? 7 * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;
  const startTime = now - periodMs;

  // Latência
  const chatLatency = getLatencyStats("ai_chat", startTime);
  const insightsLatency = getLatencyStats("ai_insights", startTime);
  const actionsLatency = getLatencyStats("ai_actions", startTime);

  // Erros
  const errorStats = getErrorStats();
  const recentErrors = getErrors({ startTime, limit: 1000 });
  const totalRequests = getMetricValue("requests_total") || 0;
  const errorRate = totalRequests > 0 ? recentErrors.length / totalRequests : 0;

  // Métricas de uso
  const requestsByModule: Record<string, number> = {};
  const moduleMetrics = getMetricsSummary().filter(m => m.name.startsWith("requests_"));
  for (const m of moduleMetrics) {
    const moduleName = m.name.replace("requests_", "").replace("_total", "");
    requestsByModule[moduleName] = m.currentValue;
  }

  return {
    timestamp: now,
    period,
    metrics: {
      // Performance
      avgLatencyChat: chatLatency.avg,
      avgLatencyInsights: insightsLatency.avg,
      avgLatencyActions: actionsLatency.avg,
      p95LatencyChat: chatLatency.p95,
      
      // Uso
      totalRequests,
      requestsByModule,
      activeUsers: getMetricValue("active_users") || 0,
      
      // Erros
      errorRate,
      errorsBySource: errorStats.bySource,
      unresolvedErrors: errorStats.unresolvedCount,
      
      // AI Copilot
      chatMessages: getMetricValue("ai_chat_messages_total") || 0,
      insightsGenerated: getMetricValue("ai_insights_generated_total") || 0,
      alertsTriggered: getMetricValue("ai_alerts_triggered_total") || 0,
      actionsApproved: getMetricValue("ai_actions_approved_total") || 0,
      feedbackScore: getMetricValue("ai_feedback_avg_score") || 0,
      
      // Integrações
      integrationSuccessRate: getMetricValue("integration_success_rate") || 100,
      whatsappMessages: getMetricValue("whatsapp_messages_total") || 0,
      zapierTriggers: getMetricValue("zapier_triggers_total") || 0,
    },
  };
}

// ============================================================================
// MÉTRICAS PRÉ-DEFINIDAS
// ============================================================================

export function initializeDefaultMetrics(): void {
  // Contadores
  setGauge("requests_total", 0);
  setGauge("errors_total", 0);
  setGauge("active_users", 0);
  
  // AI Copilot
  setGauge("ai_chat_messages_total", 0);
  setGauge("ai_insights_generated_total", 0);
  setGauge("ai_alerts_triggered_total", 0);
  setGauge("ai_actions_approved_total", 0);
  setGauge("ai_feedback_avg_score", 0);
  
  // Integrações
  setGauge("integration_success_rate", 100);
  setGauge("whatsapp_messages_total", 0);
  setGauge("zapier_triggers_total", 0);

  // Alertas padrão
  configureAlert({
    name: "high_error_rate",
    metric: "errors_total",
    condition: "gt",
    threshold: 100,
    severity: "critical",
    cooldownMinutes: 30,
    recipients: [],
    enabled: true,
  });

  configureAlert({
    name: "slow_chat_response",
    metric: "latency_ai_chat_ms",
    condition: "gt",
    threshold: 5000,
    severity: "warning",
    cooldownMinutes: 15,
    recipients: [],
    enabled: true,
  });

  console.log("[Observability] Default metrics initialized");
}

// ============================================================================
// EXPORT PROMETHEUS FORMAT
// ============================================================================

export function exportPrometheusFormat(): string {
  const lines: string[] = [];

  for (const [name, series] of Array.from(metricsStore.entries())) {
    const lastValue = series.values[series.values.length - 1];
    if (!lastValue) continue;

    const safeName = name.replace(/[^a-zA-Z0-9_]/g, "_");
    lines.push(`# TYPE ${safeName} ${series.type}`);
    
    const labels = lastValue.labels 
      ? `{${Object.entries(lastValue.labels).map(([k, v]) => `${k}="${v}"`).join(",")}}`
      : "";
    
    lines.push(`${safeName}${labels} ${lastValue.value} ${lastValue.timestamp}`);
  }

  return lines.join("\n");
}

// Inicializar métricas padrão
initializeDefaultMetrics();
