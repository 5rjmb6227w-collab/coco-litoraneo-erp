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
} from "../../drizzle/schema";
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
});

export type AIRouter = typeof aiRouter;
