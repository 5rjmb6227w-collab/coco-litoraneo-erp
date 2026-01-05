/**
 * AI Copilot Router - Endpoints tRPC para o Copiloto IA
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  aiEvents, 
  aiInsights, 
  aiAlerts,
  aiConversations,
  aiMessages,
  aiActions,
  aiActionApprovals,
  aiFeedback,
  aiConfig,
  aiPredictions,
} from "../../drizzle/schema";
import { 
  generatePrediction, 
  ModelType,
  Provider,
} from "./mlProvider";
import {
  triggerDemandForecastOnProduction,
  triggerInventoryForecastOnMovement,
  triggerQualityPrediction,
} from "./predictionTriggers";
import { eq, desc, and, gte, lte, count, sql } from "drizzle-orm";

// Services
import { emitEvent, EVENT_TYPES, EventData } from "./eventEmitter";
import { 
  hasPermission, 
  checkPermission, 
  isFeatureEnabled, 
  enforceRateLimit,
  logAudit,
  redactSensitiveData,
  UserRole,
  FEATURE_FLAGS,
  grantFeatureAccess,
  revokeFeatureAccess,
  addRoleToFeature,
  updateRolloutPercentage,
  runSecurityChecklist,
} from "./security";
import {
  trackUsage,
  withLatencyTracking,
  logError,
  getMetricsDashboard,
  getUsageStats,
  getLatencyStats,
} from "./observability";
import {
  getNotificationConfig,
  saveNotificationConfig,
  sendDailySummary,
  checkAndSendCriticalAlerts,
} from "./emailNotifications";
import { buildContext, getSystemSummary, getRecentEvents, getActiveInsights } from "./contextBuilder";
import { 
  runAllInsightChecks, 
  dismissInsight, 
  resolveInsight,
  checkCriticalStock,
  checkOverdueProducerPayments,
  checkExpiringProducts,
  checkOverduePayables,
  checkOpenNCs,
  checkPendingPurchaseRequests,
} from "./insightGenerator";
import { 
  chat, 
  createConversation, 
  getUserConversations, 
  getConversationMessages,
  archiveConversation,
  submitFeedback,
  getQuickSummary,
} from "./chatService";

export const aiRouter = router({
  // ============================================================================
  // CHAT
  // ============================================================================
  
  /**
   * Envia mensagem para o Copiloto IA
   */
  chat: protectedProcedure
    .input(z.object({
      message: z.string().min(1).max(4000),
      conversationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const response = await chat(ctx.user.id, input.message, input.conversationId);
      if (!response) {
        throw new Error("Erro ao processar mensagem");
      }
      return response;
    }),

  /**
   * Lista conversas do usuário
   */
  listConversations: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      return getUserConversations(ctx.user.id, input?.limit || 20);
    }),

  /**
   * Busca mensagens de uma conversa
   */
  getMessages: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      return getConversationMessages(input.conversationId, input.limit);
    }),

  /**
   * Cria nova conversa
   */
  createConversation: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const id = await createConversation(ctx.user.id, input?.title);
      if (!id) throw new Error("Erro ao criar conversa");
      return { id };
    }),

  /**
   * Arquiva uma conversa
   */
  archiveConversation: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const success = await archiveConversation(input.conversationId);
      if (!success) throw new Error("Erro ao arquivar conversa");
      return { success: true };
    }),

  // ============================================================================
  // INSIGHTS
  // ============================================================================

  /**
   * Lista insights ativos
   */
  listInsights: protectedProcedure
    .input(z.object({
      status: z.enum(["active", "dismissed", "resolved"]).optional(),
      severity: z.enum(["info", "warning", "critical"]).optional(),
      module: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input?.status) {
        conditions.push(eq(aiInsights.status, input.status));
      } else {
        conditions.push(eq(aiInsights.status, "active"));
      }
      if (input?.severity) {
        conditions.push(eq(aiInsights.severity, input.severity));
      }
      if (input?.module) {
        conditions.push(eq(aiInsights.module, input.module));
      }

      const insights = await db
        .select()
        .from(aiInsights)
        .where(and(...conditions))
        .orderBy(desc(aiInsights.generatedAt))
        .limit(input?.limit || 50);

      return insights;
    }),

  /**
   * Dispensa um insight
   */
  dismissInsight: protectedProcedure
    .input(z.object({
      insightId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const success = await dismissInsight(input.insightId, ctx.user.id);
      if (!success) throw new Error("Erro ao dispensar insight");
      return { success: true };
    }),

  /**
   * Marca insight como resolvido
   */
  resolveInsight: protectedProcedure
    .input(z.object({
      insightId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const success = await resolveInsight(input.insightId);
      if (!success) throw new Error("Erro ao resolver insight");
      return { success: true };
    }),

  /**
   * Executa verificação de insights (admin only)
   */
  runInsightChecks: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Verifica se é admin
      if (ctx.user.role !== "admin" && ctx.user.role !== "ceo") {
        throw new Error("Apenas administradores podem executar verificações");
      }
      const results = await runAllInsightChecks();
      return results;
    }),

  // ============================================================================
  // EVENTOS
  // ============================================================================

  // ============================================================================
  // ALERTAS
  // ============================================================================

  /**
   * Lista alertas do sistema
   */
  listAlerts: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "sent", "failed", "read"]).optional(),
      channel: z.enum(["email", "whatsapp", "push", "in_app"]).optional(),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input?.status) {
        conditions.push(eq(aiAlerts.status, input.status));
      }
      if (input?.channel) {
        conditions.push(eq(aiAlerts.channel, input.channel));
      }

      const query = conditions.length > 0
        ? db.select().from(aiAlerts).where(and(...conditions))
        : db.select().from(aiAlerts);

      const alerts = await query
        .orderBy(desc(aiAlerts.createdAt))
        .limit(input?.limit || 50);

      return alerts;
    }),

  /**
   * Marca um alerta como lido (read)
   */
  readAlert: protectedProcedure
    .input(z.object({
      alertId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(aiAlerts)
        .set({ status: "read", readAt: new Date() })
        .where(eq(aiAlerts.id, input.alertId));

      return { success: true };
    }),

  // ============================================================================
  // EVENTOS
  // ============================================================================

  /**
   * Lista eventos recentes
   */
  listEvents: protectedProcedure
    .input(z.object({
      module: z.string().optional(),
      limit: z.number().min(1).max(200).default(50),
    }).optional())
    .query(async ({ input }) => {
      return getRecentEvents(input?.limit || 50, input?.module);
    }),

  /**
   * Registra um evento manualmente (para testes)
   */
  emitEvent: protectedProcedure
    .input(z.object({
      eventType: z.string(),
      entityType: z.string(),
      entityId: z.number(),
      producerId: z.number().optional(),
      skuId: z.number().optional(),
      payload: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const eventId = await emitEvent({
        eventType: input.eventType as EventData["eventType"],
        entityType: input.entityType,
        entityId: input.entityId,
        producerId: input.producerId,
        skuId: input.skuId,
        payload: input.payload,
        userId: ctx.user.id,
      });
      return { eventId };
    }),

  // ============================================================================
  // CONTEXTO E RESUMOS
  // ============================================================================

  /**
   * Retorna resumo rápido do sistema
   */
  getQuickSummary: protectedProcedure
    .query(async () => {
      return getQuickSummary();
    }),

  /**
   * Retorna contexto completo (para debug)
   */
  getContext: protectedProcedure
    .input(z.object({
      includeSummary: z.boolean().default(true),
      includeProduction: z.boolean().default(false),
      includeFinancial: z.boolean().default(false),
      includeQuality: z.boolean().default(false),
      includeEvents: z.boolean().default(true),
      includeInsights: z.boolean().default(true),
    }).optional())
    .query(async ({ input }) => {
      const context = await buildContext({
        includeSummary: input?.includeSummary ?? true,
        includeProduction: input?.includeProduction ?? false,
        includeFinancial: input?.includeFinancial ?? false,
        includeQuality: input?.includeQuality ?? false,
        includeEvents: input?.includeEvents ?? true,
        includeInsights: input?.includeInsights ?? true,
      });
      return context;
    }),

  // ============================================================================
  // FEEDBACK
  // ============================================================================

  /**
   * Envia feedback sobre uma mensagem
   */
  submitFeedback: protectedProcedure
    .input(z.object({
      messageId: z.number(),
      feedbackType: z.enum(["like", "dislike"]),
      comment: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const success = await submitFeedback(
        ctx.user.id,
        input.messageId,
        input.feedbackType,
        input.comment
      );
      if (!success) throw new Error("Erro ao enviar feedback");
      return { success: true };
    }),

  // ============================================================================
  // AÇÕES SUGERIDAS
  // ============================================================================

  /**
   * Lista ações sugeridas
   */
  listActions: protectedProcedure
    .input(z.object({
      status: z.enum(["suggested", "approved", "rejected", "executed", "failed"]).optional(),
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input?.status) {
        conditions.push(eq(aiActions.status, input.status));
      }

      const query = conditions.length > 0
        ? db.select().from(aiActions).where(and(...conditions))
        : db.select().from(aiActions);

      const actions = await query
        .orderBy(desc(aiActions.suggestedAt))
        .limit(input?.limit || 20);

      return actions;
    }),

  /**
   * Aprova uma ação sugerida
   */
  approveAction: protectedProcedure
    .input(z.object({
      actionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Atualiza status da ação
      await db
        .update(aiActions)
        .set({ status: "approved" })
        .where(eq(aiActions.id, input.actionId));

      // Registra aprovação
      await db.insert(aiActionApprovals).values({
        actionId: input.actionId,
        userId: ctx.user.id,
        decision: "approved",
      });

      return { success: true };
    }),

  /**
   * Rejeita uma ação sugerida
   */
  rejectAction: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Atualiza status da ação
      await db
        .update(aiActions)
        .set({ status: "rejected" })
        .where(eq(aiActions.id, input.actionId));

      // Registra rejeição
      await db.insert(aiActionApprovals).values({
        actionId: input.actionId,
        userId: ctx.user.id,
        decision: "rejected",
        reason: input.reason,
      });

      return { success: true };
    }),

  // ============================================================================
  // ESTATÍSTICAS
  // ============================================================================

  /**
   * Retorna estatísticas do Copiloto IA
   */
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Total de conversas do usuário
      const conversationsResult = await db
        .select({ count: count() })
        .from(aiConversations)
        .where(eq(aiConversations.userId, ctx.user.id));

      // Total de mensagens
      const messagesResult = await db
        .select({ count: count() })
        .from(aiMessages)
        .where(
          sql`${aiMessages.conversationId} IN (
            SELECT id FROM ${aiConversations} WHERE userId = ${ctx.user.id}
          )`
        );

      // Insights ativos
      const insightsResult = await db
        .select({ count: count() })
        .from(aiInsights)
        .where(eq(aiInsights.status, "active"));

      // Eventos nos últimos 30 dias
      const eventsResult = await db
        .select({ count: count() })
        .from(aiEvents)
        .where(gte(aiEvents.createdAt, thirtyDaysAgo));

      return {
        conversations: conversationsResult[0]?.count || 0,
        messages: messagesResult[0]?.count || 0,
        activeInsights: insightsResult[0]?.count || 0,
        recentEvents: eventsResult[0]?.count || 0,
      };
    }),

  // ============================================================================
  // FEATURE FLAGS E ROLLOUT
  // ============================================================================

  /**
   * Verifica se o Copiloto está habilitado para o usuário
   */
  checkAccess: protectedProcedure
    .query(async ({ ctx }) => {
      const userRole = (ctx.user.role || "user") as UserRole;
      const hasAccess = isFeatureEnabled("copilot_enabled", ctx.user.id, userRole);
      const hasActionsAccess = isFeatureEnabled("copilot_actions", ctx.user.id, userRole);
      const hasAutoInsights = isFeatureEnabled("copilot_auto_insights", ctx.user.id, userRole);
      
      return {
        copilotEnabled: hasAccess,
        actionsEnabled: hasActionsAccess,
        autoInsightsEnabled: hasAutoInsights,
        userRole,
      };
    }),

  /**
   * Lista feature flags (admin only)
   */
  listFeatureFlags: protectedProcedure
    .query(async ({ ctx }) => {
      const userRole = (ctx.user.role || "user") as UserRole;
      if (userRole !== "admin" && userRole !== "ceo") {
        throw new Error("Acesso negado");
      }
      
      return FEATURE_FLAGS.map(f => ({
        name: f.name,
        enabled: f.enabled,
        allowedRoles: f.allowedRoles,
        allowedUserIds: f.allowedUserIds,
        rolloutPercentage: f.rolloutPercentage,
      }));
    }),

  /**
   * Concede acesso ao Copiloto para um usuário (admin only)
   */
  grantAccess: protectedProcedure
    .input(z.object({
      userId: z.number(),
      featureName: z.string().default("copilot_enabled"),
    }))
    .mutation(async ({ ctx, input }) => {
      const userRole = (ctx.user.role || "user") as UserRole;
      if (userRole !== "admin" && userRole !== "ceo") {
        throw new Error("Acesso negado");
      }
      
      const success = grantFeatureAccess(input.featureName, input.userId);
      
      await logAudit({
        userId: ctx.user.id,
        userRole,
        action: "grant_feature_access",
        resource: "feature_flag",
        details: { targetUserId: input.userId, featureName: input.featureName },
        success,
      });
      
      return { success };
    }),

  /**
   * Revoga acesso ao Copiloto de um usuário (admin only)
   */
  revokeAccess: protectedProcedure
    .input(z.object({
      userId: z.number(),
      featureName: z.string().default("copilot_enabled"),
    }))
    .mutation(async ({ ctx, input }) => {
      const userRole = (ctx.user.role || "user") as UserRole;
      if (userRole !== "admin" && userRole !== "ceo") {
        throw new Error("Acesso negado");
      }
      
      const success = revokeFeatureAccess(input.featureName, input.userId);
      
      await logAudit({
        userId: ctx.user.id,
        userRole,
        action: "revoke_feature_access",
        resource: "feature_flag",
        details: { targetUserId: input.userId, featureName: input.featureName },
        success,
      });
      
      return { success };
    }),

  /**
   * Adiciona role à lista de acesso de uma feature (admin only)
   */
  addRoleAccess: protectedProcedure
    .input(z.object({
      role: z.enum(["admin", "ceo", "manager", "operator", "user"]),
      featureName: z.string().default("copilot_enabled"),
    }))
    .mutation(async ({ ctx, input }) => {
      const userRole = (ctx.user.role || "user") as UserRole;
      if (userRole !== "admin" && userRole !== "ceo") {
        throw new Error("Acesso negado");
      }
      
      const success = addRoleToFeature(input.featureName, input.role);
      
      await logAudit({
        userId: ctx.user.id,
        userRole,
        action: "add_role_to_feature",
        resource: "feature_flag",
        details: { role: input.role, featureName: input.featureName },
        success,
      });
      
      return { success };
    }),

  /**
   * Atualiza percentual de rollout (admin only)
   */
  updateRollout: protectedProcedure
    .input(z.object({
      featureName: z.string(),
      percentage: z.number().min(0).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const userRole = (ctx.user.role || "user") as UserRole;
      if (userRole !== "admin" && userRole !== "ceo") {
        throw new Error("Acesso negado");
      }
      
      const success = updateRolloutPercentage(input.featureName, input.percentage);
      
      await logAudit({
        userId: ctx.user.id,
        userRole,
        action: "update_rollout_percentage",
        resource: "feature_flag",
        details: { featureName: input.featureName, percentage: input.percentage },
        success,
      });
      
      return { success };
    }),

  // ============================================================================
  // OBSERVABILIDADE
  // ============================================================================

  /**
   * Retorna dashboard de métricas (admin only)
   */
  getMetrics: protectedProcedure
    .query(async ({ ctx }) => {
      const userRole = (ctx.user.role || "user") as UserRole;
      if (userRole !== "admin" && userRole !== "ceo") {
        throw new Error("Acesso negado");
      }
      
      return getMetricsDashboard();
    }),

  /**
   * Retorna estatísticas de uso detalhadas (admin only)
   */
  getUsageStats: protectedProcedure
    .query(async ({ ctx }) => {
      const userRole = (ctx.user.role || "user") as UserRole;
      if (userRole !== "admin" && userRole !== "ceo") {
        throw new Error("Acesso negado");
      }
      
      return getUsageStats();
    }),

  /**
   * Retorna estatísticas de latência (admin only)
   */
  getLatencyStats: protectedProcedure
    .input(z.object({
      endpoint: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const userRole = (ctx.user.role || "user") as UserRole;
      if (userRole !== "admin" && userRole !== "ceo") {
        throw new Error("Acesso negado");
      }
      
      return getLatencyStats(input?.endpoint);
    }),

  /**
   * Executa checklist de segurança (admin only)
   */
  runSecurityCheck: protectedProcedure
    .query(async ({ ctx }) => {
      const userRole = (ctx.user.role || "user") as UserRole;
      if (userRole !== "admin" && userRole !== "ceo") {
        throw new Error("Acesso negado");
      }
      
      return runSecurityChecklist();
    }),

  // ============================================================================
  // NOTIFICAÇÕES POR E-MAIL
  // ============================================================================

  /**
   * Obtém configuração de notificações (admin only)
   */
  getNotificationConfig: protectedProcedure
    .query(async ({ ctx }) => {
      const userRole = (ctx.user.role || "user") as UserRole;
      if (userRole !== "admin" && userRole !== "ceo") {
        throw new Error("Acesso negado");
      }
      
      return getNotificationConfig();
    }),

  /**
   * Salva configuração de notificações (admin only)
   */
  saveNotificationConfig: protectedProcedure
    .input(z.object({
      criticalAlertsEnabled: z.boolean().optional(),
      dailySummaryEnabled: z.boolean().optional(),
      dailySummaryTime: z.string().optional(),
      weeklyReportEnabled: z.boolean().optional(),
      weeklyReportDay: z.number().min(0).max(6).optional(),
      recipientRoles: z.array(z.string()).optional(),
      recipientUserIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userRole = (ctx.user.role || "user") as UserRole;
      if (userRole !== "admin" && userRole !== "ceo") {
        throw new Error("Acesso negado");
      }
      
      const success = await saveNotificationConfig(input);
      
      await logAudit({
        userId: ctx.user.id,
        userRole,
        action: "update_notification_config",
        resource: "notification_config",
        details: input,
        success,
      });
      
      return { success };
    }),

  /**
   * Envia resumo diário manualmente (admin only)
   */
  sendDailySummary: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userRole = (ctx.user.role || "user") as UserRole;
      if (userRole !== "admin" && userRole !== "ceo") {
        throw new Error("Acesso negado");
      }
      
      const success = await sendDailySummary();
      return { success };
    }),

  /**
   * Verifica e envia alertas críticos pendentes (admin only)
   */
  sendCriticalAlerts: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userRole = (ctx.user.role || "user") as UserRole;
      if (userRole !== "admin" && userRole !== "ceo") {
        throw new Error("Acesso negado");
      }
      
      const sentCount = await checkAndSendCriticalAlerts();
      return { sentCount };
    }),

  // ============================================================================
  // ML PREDICTIONS
  // ============================================================================

  /**
   * Gera previsão sob demanda
   */
  generatePrediction: protectedProcedure
    .input(z.object({
      module: z.enum(["production", "warehouse", "quality", "financial"]),
      period: z.enum(["7days", "30days", "90days", "1year"]),
      confidenceLevel: z.enum(["low", "medium", "high"]).optional(),
      entityType: z.string().optional(),
      entityId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userRole = (ctx.user.role || "user") as UserRole;
      
      await enforceRateLimit(ctx.user.id, "prediction");
      
      const modelType: ModelType = input.module === "production" 
        ? "demand_forecast" 
        : input.module === "warehouse" 
          ? "inventory_forecast" 
          : "quality_prediction";
      
      const prediction = await generatePrediction({
        modelType,
        module: input.module,
        entityType: input.entityType || input.module,
        entityId: input.entityId || 0,
        period: input.period,
        historicalData: { requestedBy: ctx.user.id, timestamp: new Date().toISOString() },
        confidenceLevel: input.confidenceLevel,
      });
      
      await logAudit({
        userId: ctx.user.id,
        userRole,
        action: "generate_prediction",
        resource: "ai_prediction",
        details: { module: input.module, period: input.period, predictionId: prediction.id },
        success: true,
      });
      
      return prediction;
    }),

  /**
   * Lista histórico de previsões
   */
  listPredictions: protectedProcedure
    .input(z.object({
      module: z.string().optional(),
      modelType: z.enum(["demand_forecast", "inventory_forecast", "quality_prediction"]).optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      
      let query = db.select().from(aiPredictions).orderBy(desc(aiPredictions.generatedAt)).limit(input.limit);
      
      const predictions = await query;
      return predictions;
    }),

  /**
   * Obtém detalhes de uma previsão específica
   */
  getPrediction: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const prediction = await db.select().from(aiPredictions).where(eq(aiPredictions.id, input.id));
      return prediction[0] || null;
    }),

  /**
   * Obtém métricas de acurácia dos modelos
   */
  getPredictionAccuracy: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { models: [], overall: 0 };
      
      const predictions = await db.select().from(aiPredictions)
        .where(gte(aiPredictions.generatedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
        .orderBy(desc(aiPredictions.generatedAt));
      
      const modelStats = new Map<string, { total: number; sumAccuracy: number }>(); 
      
      for (const p of predictions) {
        const stats = modelStats.get(p.modelType) || { total: 0, sumAccuracy: 0 };
        stats.total++;
        stats.sumAccuracy += Number(p.accuracyEstimate) || 0;
        modelStats.set(p.modelType, stats);
      }
      
      const models = Array.from(modelStats.entries()).map(([modelType, stats]) => ({
        modelType,
        totalPredictions: stats.total,
        avgAccuracy: Math.round((stats.sumAccuracy / stats.total) * 100),
      }));
      
      const overall = predictions.length > 0 
        ? Math.round(predictions.reduce((acc, p) => acc + (Number(p.accuracyEstimate) || 0), 0) / predictions.length * 100)
        : 0;
      
      return { models, overall };
    }),

  /**
   * Obtém histórico de previsões para gráficos
   */
  getPredictionHistory: protectedProcedure
    .input(z.object({
      days: z.number().min(7).max(365).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const startDate = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
      
      const predictions = await db.select().from(aiPredictions)
        .where(gte(aiPredictions.generatedAt, startDate))
        .orderBy(aiPredictions.generatedAt);
      
      // Agrupar por dia
      const dailyData = new Map<string, { date: string; predictions: number; avgAccuracy: number; avgTime: number }>();
      
      for (const p of predictions) {
        const day = p.generatedAt.toISOString().split("T")[0];
        const existing = dailyData.get(day) || { date: day, predictions: 0, avgAccuracy: 0, avgTime: 0 };
        const newCount = existing.predictions + 1;
        const accuracy = Number(p.accuracyEstimate) || 0.85;
        const time = p.executionTimeMs || 100;
        
        dailyData.set(day, {
          date: day,
          predictions: newCount,
          avgAccuracy: Math.round(((existing.avgAccuracy * existing.predictions + accuracy * 100) / newCount)),
          avgTime: Math.round((existing.avgTime * existing.predictions + time) / newCount),
        });
      }
      
      return Array.from(dailyData.values());
    }),

  /**
   * Dispara previsão de demanda para produção
   */
  triggerDemandForecast: protectedProcedure
    .input(z.object({
      skuId: z.number(),
      quantity: z.number(),
      shift: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await triggerDemandForecastOnProduction(input.skuId, input.quantity, input.shift);
      return { success: true };
    }),

  /**
   * Dispara previsão de estoque
   */
  triggerInventoryForecast: protectedProcedure
    .input(z.object({
      warehouseItemId: z.number(),
      currentStock: z.number(),
      minimumStock: z.number(),
      itemName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await triggerInventoryForecastOnMovement(
        input.warehouseItemId, 
        input.currentStock, 
        input.minimumStock,
        input.itemName
      );
      return { success: true };
    }),

  /**
   * Dashboard de KPIs de ML
   */
  getMLDashboard: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { totalPredictions: 0, avgAccuracy: 0, avgExecutionTime: 0, modelBreakdown: [], recentPredictions: [] };
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const predictions = await db.select().from(aiPredictions)
        .where(gte(aiPredictions.generatedAt, thirtyDaysAgo))
        .orderBy(desc(aiPredictions.generatedAt))
        .limit(100);
      
      const totalPredictions = predictions.length;
      const avgAccuracy = totalPredictions > 0 
        ? Math.round(predictions.reduce((acc, p) => acc + (Number(p.accuracyEstimate) || 0), 0) / totalPredictions * 100)
        : 0;
      const avgExecutionTime = totalPredictions > 0
        ? Math.round(predictions.reduce((acc, p) => acc + (p.executionTimeMs || 0), 0) / totalPredictions)
        : 0;
      
      // Breakdown por modelo
      const modelMap = new Map<string, number>();
      for (const p of predictions) {
        modelMap.set(p.modelType, (modelMap.get(p.modelType) || 0) + 1);
      }
      const modelBreakdown = Array.from(modelMap.entries()).map(([name, value]) => ({ name, value }));
      
      // Últimas 5 previsões
      const recentPredictions = predictions.slice(0, 5).map(p => ({
        id: p.id,
        modelType: p.modelType,
        module: p.module,
        accuracy: Math.round((Number(p.accuracyEstimate) || 0) * 100),
        executionTime: p.executionTimeMs,
        generatedAt: p.generatedAt,
      }));
      
      return {
        totalPredictions,
        avgAccuracy,
        avgExecutionTime,
        modelBreakdown,
        recentPredictions,
      };
    }),
});

export type AIRouter = typeof aiRouter;
