/**
 * FeatureFlagsService - Sistema avançado de feature flags
 * Bloco 9/9 - Rollout controlado e A/B testing
 */

import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type FeatureFlagType = "boolean" | "percentage" | "user_list" | "gradual_rollout";
export type FeatureFlagStatus = "enabled" | "disabled" | "scheduled";

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  type: FeatureFlagType;
  status: FeatureFlagStatus;
  
  // Configurações por tipo
  enabled?: boolean;
  percentage?: number;
  userIds?: number[];
  roleWhitelist?: string[];
  
  // Rollout gradual
  rolloutConfig?: {
    startDate: Date;
    endDate: Date;
    startPercentage: number;
    endPercentage: number;
    currentPercentage?: number;
  };
  
  // A/B Testing
  abTestConfig?: {
    variants: Array<{
      id: string;
      name: string;
      percentage: number;
    }>;
    metrics: string[];
    startDate: Date;
    endDate?: Date;
  };
  
  // Metadados
  createdAt: Date;
  updatedAt: Date;
  createdBy: number;
  tags: string[];
  environment: "development" | "staging" | "production";
}

export interface FeatureFlagEvaluation {
  flagId: string;
  enabled: boolean;
  variant?: string;
  reason: string;
  timestamp: number;
}

export interface FeatureFlagStats {
  flagId: string;
  evaluations: number;
  enabledCount: number;
  disabledCount: number;
  variantDistribution?: Record<string, number>;
  lastEvaluated: Date;
}

// ============================================================================
// FEATURE FLAGS STORE
// ============================================================================

const featureFlags: Map<string, FeatureFlag> = new Map();
const flagStats: Map<string, FeatureFlagStats> = new Map();
const userVariantAssignments: Map<string, string> = new Map(); // `${flagId}_${userId}` -> variant

// ============================================================================
// FEATURE FLAGS SERVICE
// ============================================================================

class FeatureFlagsServiceClass {
  
  // ============================================================================
  // CRUD DE FLAGS
  // ============================================================================

  createFlag(flag: Omit<FeatureFlag, "createdAt" | "updatedAt">): FeatureFlag {
    const now = new Date();
    const fullFlag: FeatureFlag = {
      ...flag,
      createdAt: now,
      updatedAt: now,
    };

    featureFlags.set(flag.id, fullFlag);
    
    // Inicializar stats
    flagStats.set(flag.id, {
      flagId: flag.id,
      evaluations: 0,
      enabledCount: 0,
      disabledCount: 0,
      lastEvaluated: now,
    });

    console.log(`[FeatureFlags] Created flag: ${flag.id}`);
    return fullFlag;
  }

  updateFlag(flagId: string, updates: Partial<FeatureFlag>): FeatureFlag | null {
    const existing = featureFlags.get(flagId);
    if (!existing) return null;

    const updated: FeatureFlag = {
      ...existing,
      ...updates,
      id: flagId, // Não permitir alterar ID
      updatedAt: new Date(),
    };

    featureFlags.set(flagId, updated);
    console.log(`[FeatureFlags] Updated flag: ${flagId}`);
    return updated;
  }

  deleteFlag(flagId: string): boolean {
    const deleted = featureFlags.delete(flagId);
    if (deleted) {
      flagStats.delete(flagId);
      console.log(`[FeatureFlags] Deleted flag: ${flagId}`);
    }
    return deleted;
  }

  getFlag(flagId: string): FeatureFlag | undefined {
    return featureFlags.get(flagId);
  }

  listFlags(filters?: {
    status?: FeatureFlagStatus;
    type?: FeatureFlagType;
    environment?: string;
    tag?: string;
  }): FeatureFlag[] {
    let flags = Array.from(featureFlags.values());

    if (filters?.status) {
      flags = flags.filter(f => f.status === filters.status);
    }

    if (filters?.type) {
      flags = flags.filter(f => f.type === filters.type);
    }

    if (filters?.environment) {
      flags = flags.filter(f => f.environment === filters.environment);
    }

    if (filters?.tag) {
      flags = flags.filter(f => f.tags.includes(filters.tag!));
    }

    return flags.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // ============================================================================
  // AVALIAÇÃO DE FLAGS
  // ============================================================================

  evaluate(
    flagId: string,
    context: {
      userId?: number;
      userRole?: string;
      sessionId?: string;
      attributes?: Record<string, unknown>;
    } = {}
  ): FeatureFlagEvaluation {
    const flag = featureFlags.get(flagId);
    const timestamp = Date.now();

    if (!flag) {
      return {
        flagId,
        enabled: false,
        reason: "Flag not found",
        timestamp,
      };
    }

    if (flag.status === "disabled") {
      this.recordEvaluation(flagId, false);
      return {
        flagId,
        enabled: false,
        reason: "Flag disabled",
        timestamp,
      };
    }

    let enabled = false;
    let variant: string | undefined;
    let reason = "";

    switch (flag.type) {
      case "boolean":
        enabled = flag.enabled ?? false;
        reason = enabled ? "Boolean flag enabled" : "Boolean flag disabled";
        break;

      case "percentage":
        enabled = this.evaluatePercentage(flag.percentage ?? 0, context.userId, context.sessionId);
        reason = enabled ? `Within ${flag.percentage}% rollout` : `Outside ${flag.percentage}% rollout`;
        break;

      case "user_list":
        enabled = this.evaluateUserList(flag, context.userId, context.userRole);
        reason = enabled ? "User in whitelist" : "User not in whitelist";
        break;

      case "gradual_rollout":
        const rolloutResult = this.evaluateGradualRollout(flag, context.userId, context.sessionId);
        enabled = rolloutResult.enabled;
        reason = rolloutResult.reason;
        break;
    }

    // A/B Testing
    if (enabled && flag.abTestConfig) {
      variant = this.assignVariant(flagId, context.userId, context.sessionId, flag.abTestConfig.variants);
      reason += ` (Variant: ${variant})`;
    }

    this.recordEvaluation(flagId, enabled, variant);

    return {
      flagId,
      enabled,
      variant,
      reason,
      timestamp,
    };
  }

  isEnabled(flagId: string, context?: Parameters<typeof this.evaluate>[1]): boolean {
    return this.evaluate(flagId, context).enabled;
  }

  getVariant(flagId: string, context?: Parameters<typeof this.evaluate>[1]): string | undefined {
    return this.evaluate(flagId, context).variant;
  }

  // ============================================================================
  // AVALIAÇÃO POR TIPO
  // ============================================================================

  private evaluatePercentage(
    percentage: number,
    userId?: number,
    sessionId?: string
  ): boolean {
    // Usar hash consistente para garantir mesma avaliação para mesmo usuário
    const identifier = userId?.toString() || sessionId || Math.random().toString();
    const hash = this.hashString(identifier);
    const normalizedHash = (hash % 100) + 1;
    
    return normalizedHash <= percentage;
  }

  private evaluateUserList(
    flag: FeatureFlag,
    userId?: number,
    userRole?: string
  ): boolean {
    // Verificar lista de usuários
    if (flag.userIds && userId && flag.userIds.includes(userId)) {
      return true;
    }

    // Verificar whitelist de roles
    if (flag.roleWhitelist && userRole && flag.roleWhitelist.includes(userRole)) {
      return true;
    }

    return false;
  }

  private evaluateGradualRollout(
    flag: FeatureFlag,
    userId?: number,
    sessionId?: string
  ): { enabled: boolean; reason: string } {
    if (!flag.rolloutConfig) {
      return { enabled: false, reason: "No rollout config" };
    }

    const { startDate, endDate, startPercentage, endPercentage } = flag.rolloutConfig;
    const now = new Date();

    if (now < startDate) {
      return { enabled: false, reason: "Rollout not started" };
    }

    if (now > endDate) {
      // Rollout completo
      return { 
        enabled: this.evaluatePercentage(endPercentage, userId, sessionId),
        reason: `Rollout complete at ${endPercentage}%`,
      };
    }

    // Calcular percentual atual baseado no tempo
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    const progress = elapsed / totalDuration;
    const currentPercentage = startPercentage + (endPercentage - startPercentage) * progress;

    // Atualizar percentual atual no config
    flag.rolloutConfig.currentPercentage = Math.round(currentPercentage);

    return {
      enabled: this.evaluatePercentage(currentPercentage, userId, sessionId),
      reason: `Gradual rollout at ${Math.round(currentPercentage)}%`,
    };
  }

  // ============================================================================
  // A/B TESTING
  // ============================================================================

  private assignVariant(
    flagId: string,
    userId: number | undefined,
    sessionId: string | undefined,
    variants: Array<{ id: string; name: string; percentage: number }>
  ): string {
    const key = `${flagId}_${userId || sessionId || "anonymous"}`;
    
    // Verificar se já tem variante atribuída
    const existingVariant = userVariantAssignments.get(key);
    if (existingVariant) {
      return existingVariant;
    }

    // Atribuir nova variante baseado em percentuais
    const identifier = userId?.toString() || sessionId || Math.random().toString();
    const hash = this.hashString(identifier + flagId);
    const normalizedHash = (hash % 100) + 1;

    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.percentage;
      if (normalizedHash <= cumulative) {
        userVariantAssignments.set(key, variant.id);
        return variant.id;
      }
    }

    // Fallback para primeira variante
    const defaultVariant = variants[0]?.id || "control";
    userVariantAssignments.set(key, defaultVariant);
    return defaultVariant;
  }

  // ============================================================================
  // ESTATÍSTICAS
  // ============================================================================

  private recordEvaluation(flagId: string, enabled: boolean, variant?: string): void {
    const stats = flagStats.get(flagId);
    if (!stats) return;

    stats.evaluations++;
    if (enabled) {
      stats.enabledCount++;
    } else {
      stats.disabledCount++;
    }
    stats.lastEvaluated = new Date();

    if (variant) {
      if (!stats.variantDistribution) {
        stats.variantDistribution = {};
      }
      stats.variantDistribution[variant] = (stats.variantDistribution[variant] || 0) + 1;
    }
  }

  getStats(flagId: string): FeatureFlagStats | undefined {
    return flagStats.get(flagId);
  }

  getAllStats(): FeatureFlagStats[] {
    return Array.from(flagStats.values());
  }

  // ============================================================================
  // UTILITÁRIOS
  // ============================================================================

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  async logFlagChange(
    flagId: string,
    action: string,
    userId: number,
    oldValue: unknown,
    newValue: unknown
  ): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      await db.insert(auditLogs).values({
        action: `feature_flag_${action}`,
        module: "feature_flags",
        entityType: "feature_flag",
        entityId: 0,
        fieldName: flagId,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        userId,
        ipAddress: "system",
        userAgent: "FeatureFlagsService",
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("[FeatureFlags] Failed to log change:", error);
    }
  }
}

// Singleton
export const FeatureFlagsService = new FeatureFlagsServiceClass();

// ============================================================================
// FLAGS PADRÃO DO SISTEMA
// ============================================================================

export function initializeDefaultFlags(): void {
  // Copiloto IA
  FeatureFlagsService.createFlag({
    id: "ai_copilot_enabled",
    name: "Copiloto IA",
    description: "Habilita o assistente de IA no sistema",
    type: "boolean",
    status: "enabled",
    enabled: true,
    createdBy: 0,
    tags: ["ai", "core"],
    environment: "production",
  });

  FeatureFlagsService.createFlag({
    id: "ai_auto_actions",
    name: "Ações Automáticas da IA",
    description: "Permite que a IA execute ações automaticamente",
    type: "percentage",
    status: "enabled",
    percentage: 50,
    createdBy: 0,
    tags: ["ai", "automation"],
    environment: "production",
  });

  // Integrações
  FeatureFlagsService.createFlag({
    id: "whatsapp_notifications",
    name: "Notificações WhatsApp",
    description: "Envia notificações via WhatsApp",
    type: "user_list",
    status: "enabled",
    roleWhitelist: ["admin", "ceo", "producao"],
    createdBy: 0,
    tags: ["integration", "notifications"],
    environment: "production",
  });

  FeatureFlagsService.createFlag({
    id: "zapier_integration",
    name: "Integração Zapier",
    description: "Permite automações via Zapier",
    type: "boolean",
    status: "enabled",
    enabled: true,
    createdBy: 0,
    tags: ["integration", "automation"],
    environment: "production",
  });

  FeatureFlagsService.createFlag({
    id: "calendar_sync",
    name: "Sincronização com Calendário",
    description: "Sincroniza vencimentos com Google Calendar",
    type: "gradual_rollout",
    status: "enabled",
    rolloutConfig: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      startPercentage: 10,
      endPercentage: 100,
    },
    createdBy: 0,
    tags: ["integration", "calendar"],
    environment: "production",
  });

  // Novos recursos
  FeatureFlagsService.createFlag({
    id: "new_dashboard_ui",
    name: "Nova Interface do Dashboard",
    description: "Teste A/B da nova interface do dashboard",
    type: "percentage",
    status: "enabled",
    percentage: 100,
    abTestConfig: {
      variants: [
        { id: "control", name: "Interface Atual", percentage: 50 },
        { id: "variant_a", name: "Nova Interface", percentage: 50 },
      ],
      metrics: ["time_on_page", "actions_completed", "user_satisfaction"],
      startDate: new Date(),
    },
    createdBy: 0,
    tags: ["ui", "ab_test"],
    environment: "production",
  });

  FeatureFlagsService.createFlag({
    id: "advanced_analytics",
    name: "Analytics Avançados",
    description: "Métricas e dashboards avançados para admin",
    type: "user_list",
    status: "enabled",
    roleWhitelist: ["admin", "ceo"],
    createdBy: 0,
    tags: ["analytics", "admin"],
    environment: "production",
  });

  // i18n
  FeatureFlagsService.createFlag({
    id: "multi_language",
    name: "Multi-idioma",
    description: "Suporte a múltiplos idiomas (PT-BR, EN, ES)",
    type: "boolean",
    status: "enabled",
    enabled: true,
    createdBy: 0,
    tags: ["i18n", "core"],
    environment: "production",
  });

  console.log("[FeatureFlags] Default flags initialized");
}

// Inicializar flags padrão
initializeDefaultFlags();

// ============================================================================
// FUNÇÕES DE CONVENIÊNCIA
// ============================================================================

export function isFeatureEnabled(
  flagId: string,
  userId?: number,
  userRole?: string
): boolean {
  return FeatureFlagsService.isEnabled(flagId, { userId, userRole });
}

export function getFeatureVariant(
  flagId: string,
  userId?: number,
  userRole?: string
): string | undefined {
  return FeatureFlagsService.getVariant(flagId, { userId, userRole });
}
