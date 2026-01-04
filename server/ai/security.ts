/**
 * Módulo de Segurança e LGPD para o Copiloto IA
 * - RBAC no contexto e execução
 * - Mascaramento de dados sensíveis
 * - Rate limiting por usuário
 * - Auditoria completa
 */

import { getDb } from "../db";
import { aiEvents } from "../../drizzle/schema";
import { eq, and, gte, sql } from "drizzle-orm";

// ============================================
// RBAC - Role-Based Access Control
// ============================================

export type UserRole = "admin" | "ceo" | "manager" | "operator" | "user";

export interface Permission {
  action: string;
  resource: string;
  allowedRoles: UserRole[];
}

// Definição de permissões do Copiloto IA
export const COPILOT_PERMISSIONS: Permission[] = [
  // Chat
  { action: "chat.send", resource: "ai_chat", allowedRoles: ["admin", "ceo", "manager", "operator", "user"] },
  { action: "chat.history", resource: "ai_chat", allowedRoles: ["admin", "ceo", "manager", "operator", "user"] },
  
  // Insights
  { action: "insights.list", resource: "ai_insights", allowedRoles: ["admin", "ceo", "manager", "operator"] },
  { action: "insights.dismiss", resource: "ai_insights", allowedRoles: ["admin", "ceo", "manager"] },
  { action: "insights.resolve", resource: "ai_insights", allowedRoles: ["admin", "ceo", "manager"] },
  
  // Alertas
  { action: "alerts.list", resource: "ai_alerts", allowedRoles: ["admin", "ceo", "manager", "operator"] },
  { action: "alerts.acknowledge", resource: "ai_alerts", allowedRoles: ["admin", "ceo", "manager"] },
  
  // Ações
  { action: "actions.list", resource: "ai_actions", allowedRoles: ["admin", "ceo", "manager"] },
  { action: "actions.approve", resource: "ai_actions", allowedRoles: ["admin", "ceo"] },
  { action: "actions.reject", resource: "ai_actions", allowedRoles: ["admin", "ceo", "manager"] },
  { action: "actions.execute", resource: "ai_actions", allowedRoles: ["admin", "ceo"] },
  
  // Configurações
  { action: "config.view", resource: "ai_config", allowedRoles: ["admin", "ceo"] },
  { action: "config.edit", resource: "ai_config", allowedRoles: ["admin", "ceo"] },
  
  // Contexto (dados do sistema)
  { action: "context.production", resource: "ai_context", allowedRoles: ["admin", "ceo", "manager", "operator"] },
  { action: "context.financial", resource: "ai_context", allowedRoles: ["admin", "ceo", "manager"] },
  { action: "context.hr", resource: "ai_context", allowedRoles: ["admin", "ceo"] },
  { action: "context.full", resource: "ai_context", allowedRoles: ["admin", "ceo"] },
];

/**
 * Verifica se um usuário tem permissão para uma ação
 */
export function hasPermission(userRole: UserRole, action: string): boolean {
  const permission = COPILOT_PERMISSIONS.find(p => p.action === action);
  if (!permission) return false;
  return permission.allowedRoles.includes(userRole);
}

/**
 * Retorna todas as permissões de um role
 */
export function getRolePermissions(role: UserRole): string[] {
  return COPILOT_PERMISSIONS
    .filter(p => p.allowedRoles.includes(role))
    .map(p => p.action);
}

/**
 * Middleware de verificação de permissão
 */
export function checkPermission(userRole: UserRole, action: string): void {
  if (!hasPermission(userRole, action)) {
    throw new Error(`Acesso negado: usuário com role '${userRole}' não tem permissão para '${action}'`);
  }
}

// ============================================
// MASCARAMENTO DE DADOS SENSÍVEIS (LGPD)
// ============================================

/**
 * Mascara dados sensíveis em texto
 */
export function redactSensitiveData(text: string): string {
  let result = text;
  
  // CPF: 000.000.000-00 ou 00000000000
  result = result.replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, "***.***.***-**");
  result = result.replace(/\b\d{11}\b/g, "***********");
  
  // CNPJ: 00.000.000/0000-00
  result = result.replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, "**.***.***\/****-**");
  
  // Telefone: (00) 00000-0000 ou (00) 0000-0000
  result = result.replace(/\(\d{2}\)\s?\d{4,5}-?\d{4}/g, "(XX) XXXXX-XXXX");
  
  // E-mail
  result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "***@***.***");
  
  // Chave PIX
  result = result.replace(/pix:\s*[^\s,]+/gi, "pix: ***REDACTED***");
  
  // Dados bancários
  result = result.replace(/ag[êe]ncia:?\s*\d+/gi, "agência: ****");
  result = result.replace(/conta:?\s*\d+-?\d*/gi, "conta: ****-*");
  
  // Salário
  result = result.replace(/sal[aá]rio:?\s*R?\$?\s*[\d.,]+/gi, "salário: R$ ***,**");
  
  // RG
  result = result.replace(/\b\d{2}\.\d{3}\.\d{3}-\d{1}\b/g, "**.***.***-*");
  
  return result;
}

/**
 * Mascara dados sensíveis em objeto
 */
export function redactSensitiveObject<T extends Record<string, unknown>>(obj: T): T {
  const sensitiveFields = [
    "cpf", "cnpj", "rg", "phone", "telefone", "email",
    "pix", "pixKey", "bankAccount", "conta", "agencia",
    "salary", "salario", "password", "senha", "token"
  ];
  
  const result = { ...obj };
  
  for (const key of Object.keys(result)) {
    const lowerKey = key.toLowerCase();
    
    // Campo sensível - mascarar completamente
    if (sensitiveFields.some(f => lowerKey.includes(f))) {
      result[key as keyof T] = "***REDACTED***" as T[keyof T];
      continue;
    }
    
    // String - aplicar redação
    if (typeof result[key] === "string") {
      result[key as keyof T] = redactSensitiveData(result[key] as string) as T[keyof T];
    }
    
    // Objeto aninhado - recursão
    if (typeof result[key] === "object" && result[key] !== null && !Array.isArray(result[key])) {
      result[key as keyof T] = redactSensitiveObject(result[key] as Record<string, unknown>) as T[keyof T];
    }
  }
  
  return result;
}

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitState {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitState>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Configurações de rate limit por tipo de operação
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "chat": { maxRequests: 30, windowMs: 60000 },      // 30 msgs/min
  "insights": { maxRequests: 60, windowMs: 60000 },  // 60 req/min
  "actions": { maxRequests: 20, windowMs: 60000 },   // 20 req/min
  "config": { maxRequests: 10, windowMs: 60000 },    // 10 req/min
  "default": { maxRequests: 100, windowMs: 60000 }   // 100 req/min
};

/**
 * Verifica rate limit para um usuário
 */
export function checkRateLimit(
  userId: number,
  operation: string
): { allowed: boolean; remaining: number; resetAt: number } {
  const config = RATE_LIMITS[operation] || RATE_LIMITS.default;
  const key = `${userId}:${operation}`;
  const now = Date.now();
  
  const state = rateLimitStore.get(key);
  
  // Nova janela
  if (!state || now - state.windowStart > config.windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs
    };
  }
  
  // Limite excedido
  if (state.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: state.windowStart + config.windowMs
    };
  }
  
  // Incrementar contador
  state.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - state.count,
    resetAt: state.windowStart + config.windowMs
  };
}

/**
 * Middleware de rate limiting
 */
export function enforceRateLimit(userId: number, operation: string): void {
  const result = checkRateLimit(userId, operation);
  if (!result.allowed) {
    const resetIn = Math.ceil((result.resetAt - Date.now()) / 1000);
    throw new Error(`Rate limit excedido. Tente novamente em ${resetIn} segundos.`);
  }
}

// ============================================
// AUDITORIA
// ============================================

export interface AuditLogEntry {
  userId: number;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: number;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

/**
 * Registra entrada de auditoria
 */
export async function logAudit(entry: Omit<AuditLogEntry, "timestamp">): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Mascarar dados sensíveis nos detalhes
  const safeDetails = redactSensitiveObject(entry.details);
  
  await db.insert(aiEvents).values({
    eventType: `audit:${entry.action}`,
    module: "ai_copilot",
    entityType: entry.resource,
    entityId: entry.resourceId || 0,
    createdBy: entry.userId,
    payload: {
      userRole: entry.userRole,
      details: safeDetails,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      success: entry.success,
      errorMessage: entry.errorMessage
    },
    createdAt: new Date()
  });
}

/**
 * Busca logs de auditoria
 */
export async function getAuditLogs(filters: {
  userId?: number;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar todos os eventos de auditoria
  const results = await db.select().from(aiEvents)
    .where(sql`${aiEvents.eventType} LIKE 'audit:%'`)
    .orderBy(sql`${aiEvents.createdAt} DESC`)
    .limit(filters.limit || 100);
  
  // Filtrar em memória para simplificar
  let filtered = results;
  
  if (filters.userId) {
    filtered = filtered.filter(r => r.createdBy === filters.userId);
  }
  
  if (filters.action) {
    filtered = filtered.filter(r => r.eventType === `audit:${filters.action}`);
  }
  
  if (filters.resource) {
    filtered = filtered.filter(r => r.entityType === filters.resource);
  }
  
  if (filters.startDate) {
    filtered = filtered.filter(r => r.createdAt >= filters.startDate!);
  }
  
  return filtered.map((r: typeof results[0]) => ({
    userId: r.createdBy || 0,
    userRole: (r.payload as Record<string, unknown>)?.userRole as string || "unknown",
    action: r.eventType.replace("audit:", ""),
    resource: r.entityType,
    resourceId: r.entityId,
    details: (r.payload as Record<string, unknown>)?.details as Record<string, unknown> || {},
    ipAddress: (r.payload as Record<string, unknown>)?.ipAddress as string,
    userAgent: (r.payload as Record<string, unknown>)?.userAgent as string,
    timestamp: r.createdAt,
    success: (r.payload as Record<string, unknown>)?.success as boolean ?? true,
    errorMessage: (r.payload as Record<string, unknown>)?.errorMessage as string
  }));
}

// ============================================
// FEATURE FLAGS
// ============================================

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  allowedRoles: UserRole[];
  allowedUserIds: number[];
  rolloutPercentage: number;
}

// Feature flags do Copiloto IA
export const FEATURE_FLAGS: FeatureFlag[] = [
  {
    name: "copilot_enabled",
    enabled: true,
    allowedRoles: ["admin", "ceo"],
    allowedUserIds: [], // IDs específicos com acesso
    rolloutPercentage: 100 // 100% dos roles permitidos
  },
  {
    name: "copilot_actions",
    enabled: true,
    allowedRoles: ["admin", "ceo"],
    allowedUserIds: [],
    rolloutPercentage: 100
  },
  {
    name: "copilot_auto_insights",
    enabled: true,
    allowedRoles: ["admin", "ceo", "manager"],
    allowedUserIds: [],
    rolloutPercentage: 100
  }
];

/**
 * Verifica se uma feature está habilitada para um usuário
 */
export function isFeatureEnabled(
  featureName: string,
  userId: number,
  userRole: UserRole
): boolean {
  const flag = FEATURE_FLAGS.find(f => f.name === featureName);
  
  if (!flag || !flag.enabled) {
    return false;
  }
  
  // Usuário específico na lista
  if (flag.allowedUserIds.includes(userId)) {
    return true;
  }
  
  // Role permitido
  if (flag.allowedRoles.includes(userRole)) {
    // Aplicar rollout percentage
    if (flag.rolloutPercentage < 100) {
      const hash = userId % 100;
      return hash < flag.rolloutPercentage;
    }
    return true;
  }
  
  return false;
}

/**
 * Adiciona usuário à lista de acesso de uma feature
 */
export function grantFeatureAccess(featureName: string, userId: number): boolean {
  const flag = FEATURE_FLAGS.find(f => f.name === featureName);
  if (!flag) return false;
  
  if (!flag.allowedUserIds.includes(userId)) {
    flag.allowedUserIds.push(userId);
  }
  return true;
}

/**
 * Remove usuário da lista de acesso de uma feature
 */
export function revokeFeatureAccess(featureName: string, userId: number): boolean {
  const flag = FEATURE_FLAGS.find(f => f.name === featureName);
  if (!flag) return false;
  
  const index = flag.allowedUserIds.indexOf(userId);
  if (index > -1) {
    flag.allowedUserIds.splice(index, 1);
  }
  return true;
}

/**
 * Atualiza rollout percentage de uma feature
 */
export function updateRolloutPercentage(featureName: string, percentage: number): boolean {
  const flag = FEATURE_FLAGS.find(f => f.name === featureName);
  if (!flag) return false;
  
  flag.rolloutPercentage = Math.max(0, Math.min(100, percentage));
  return true;
}

/**
 * Adiciona role à lista de acesso de uma feature
 */
export function addRoleToFeature(featureName: string, role: UserRole): boolean {
  const flag = FEATURE_FLAGS.find(f => f.name === featureName);
  if (!flag) return false;
  
  if (!flag.allowedRoles.includes(role)) {
    flag.allowedRoles.push(role);
  }
  return true;
}

// ============================================
// CHECKLIST DE SEGURANÇA
// ============================================

export interface SecurityCheckResult {
  check: string;
  passed: boolean;
  details: string;
}

/**
 * Executa checklist de segurança
 */
export function runSecurityChecklist(): SecurityCheckResult[] {
  const results: SecurityCheckResult[] = [];
  
  // 1. RBAC configurado
  results.push({
    check: "RBAC configurado",
    passed: COPILOT_PERMISSIONS.length > 0,
    details: `${COPILOT_PERMISSIONS.length} permissões definidas`
  });
  
  // 2. Rate limiting ativo
  results.push({
    check: "Rate limiting ativo",
    passed: Object.keys(RATE_LIMITS).length > 0,
    details: `${Object.keys(RATE_LIMITS).length} configurações de rate limit`
  });
  
  // 3. Feature flags configurados
  results.push({
    check: "Feature flags configurados",
    passed: FEATURE_FLAGS.length > 0,
    details: `${FEATURE_FLAGS.length} feature flags definidos`
  });
  
  // 4. Mascaramento de dados implementado
  const testRedaction = redactSensitiveData("CPF: 123.456.789-00");
  results.push({
    check: "Mascaramento de dados implementado",
    passed: !testRedaction.includes("123.456.789-00"),
    details: "Função redactSensitiveData operacional"
  });
  
  // 5. Auditoria disponível
  results.push({
    check: "Auditoria disponível",
    passed: typeof logAudit === "function",
    details: "Função logAudit disponível"
  });
  
  // 6. Copiloto restrito inicialmente
  const copilotFlag = FEATURE_FLAGS.find(f => f.name === "copilot_enabled");
  results.push({
    check: "Copiloto restrito inicialmente",
    passed: copilotFlag?.allowedRoles.length === 2 && 
            copilotFlag.allowedRoles.includes("admin") && 
            copilotFlag.allowedRoles.includes("ceo"),
    details: `Acesso inicial: ${copilotFlag?.allowedRoles.join(", ")}`
  });
  
  return results;
}

// ============================================
// EXPORTS
// ============================================

export default {
  // RBAC
  hasPermission,
  getRolePermissions,
  checkPermission,
  
  // LGPD
  redactSensitiveData,
  redactSensitiveObject,
  
  // Rate Limiting
  checkRateLimit,
  enforceRateLimit,
  
  // Auditoria
  logAudit,
  getAuditLogs,
  
  // Feature Flags
  isFeatureEnabled,
  grantFeatureAccess,
  revokeFeatureAccess,
  updateRolloutPercentage,
  addRoleToFeature,
  
  // Checklist
  runSecurityChecklist
};
