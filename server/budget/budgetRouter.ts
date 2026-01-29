import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as budgetService from "./budgetService";

export const budgetRouter = router({
  // ============================================================================
  // BUDGETS - CRUD Principal
  // ============================================================================
  
  create: protectedProcedure
    .input(z.object({
      year: z.number(),
      name: z.string(),
      type: z.enum(["anual", "mensal", "trimestral"]).default("anual"),
      scenario: z.enum(["conservador", "moderado", "otimista", "base_zero"]).default("moderado"),
      observations: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return budgetService.createBudget({
        ...input,
        status: "rascunho",
        createdBy: ctx.user.id,
      });
    }),
  
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return budgetService.getBudgetById(input.id);
    }),
  
  list: protectedProcedure
    .input(z.object({ year: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return budgetService.listBudgets(input?.year);
    }),
  
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      type: z.enum(["anual", "mensal", "trimestral"]).optional(),
      scenario: z.enum(["conservador", "moderado", "otimista", "base_zero"]).optional(),
      status: z.enum(["rascunho", "em_aprovacao", "aprovado", "revisao", "encerrado"]).optional(),
      observations: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return budgetService.updateBudget(id, { ...data, updatedBy: ctx.user.id });
    }),
  
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return budgetService.deleteBudget(input.id);
    }),
  
  // ============================================================================
  // BUDGET LINES - Linhas do Orçamento
  // ============================================================================
  
  lines: router({
    create: protectedProcedure
      .input(z.object({
        budgetId: z.number(),
        costCenter: z.enum(["producao", "comercial", "administrativo", "rh", "manutencao", "qualidade", "logistica", "ti"]),
        category: z.string(),
        isCapex: z.boolean().default(false),
        description: z.string().optional(),
        jan: z.string().default("0"),
        fev: z.string().default("0"),
        mar: z.string().default("0"),
        abr: z.string().default("0"),
        mai: z.string().default("0"),
        jun: z.string().default("0"),
        jul: z.string().default("0"),
        ago: z.string().default("0"),
        set: z.string().default("0"),
        out: z.string().default("0"),
        nov: z.string().default("0"),
        dez: z.string().default("0"),
        justification: z.string().optional(),
        priority: z.enum(["essencial", "importante", "desejavel"]).default("importante"),
        roiPercent: z.string().optional(),
        paybackMonths: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return budgetService.createBudgetLine({
          ...input,
          category: input.category as any,
          createdBy: ctx.user.id,
        });
      }),
    
    list: protectedProcedure
      .input(z.object({ budgetId: z.number() }))
      .query(async ({ input }) => {
        return budgetService.getBudgetLines(input.budgetId);
      }),
    
    byCostCenter: protectedProcedure
      .input(z.object({ 
        budgetId: z.number(),
        costCenter: z.string(),
      }))
      .query(async ({ input }) => {
        return budgetService.getBudgetLinesByCostCenter(input.budgetId, input.costCenter);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        jan: z.string().optional(),
        fev: z.string().optional(),
        mar: z.string().optional(),
        abr: z.string().optional(),
        mai: z.string().optional(),
        jun: z.string().optional(),
        jul: z.string().optional(),
        ago: z.string().optional(),
        set: z.string().optional(),
        out: z.string().optional(),
        nov: z.string().optional(),
        dez: z.string().optional(),
        description: z.string().optional(),
        justification: z.string().optional(),
        priority: z.enum(["essencial", "importante", "desejavel"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        return budgetService.updateBudgetLine(id, { ...data, updatedBy: ctx.user.id });
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return budgetService.deleteBudgetLine(input.id);
      }),
  }),
  
  // ============================================================================
  // BUDGET ACTUALS - Realizado
  // ============================================================================
  
  actuals: router({
    list: protectedProcedure
      .input(z.object({ 
        budgetId: z.number(),
        month: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return budgetService.getBudgetActuals(input.budgetId, input.month);
      }),
    
    calculate: protectedProcedure
      .input(z.object({
        budgetId: z.number(),
        year: z.number(),
        month: z.number(),
      }))
      .mutation(async ({ input }) => {
        return budgetService.calculateActualsFromFinancial(input.budgetId, input.year, input.month);
      }),
  }),
  
  // ============================================================================
  // SCENARIOS - Cenários
  // ============================================================================
  
  scenarios: router({
    create: protectedProcedure
      .input(z.object({
        budgetId: z.number(),
        name: z.string(),
        type: z.enum(["conservador", "moderado", "otimista"]),
        assumptions: z.any().optional(),
        revenueAdjustment: z.string().default("0"),
        expenseAdjustment: z.string().default("0"),
        inflationRate: z.string().default("0"),
        growthRate: z.string().default("0"),
      }))
      .mutation(async ({ input, ctx }) => {
        return budgetService.createScenario({
          ...input,
          createdBy: ctx.user.id,
        });
      }),
    
    list: protectedProcedure
      .input(z.object({ budgetId: z.number() }))
      .query(async ({ input }) => {
        return budgetService.getScenarios(input.budgetId);
      }),
    
    compare: protectedProcedure
      .input(z.object({ budgetId: z.number() }))
      .query(async ({ input }) => {
        return budgetService.compareScenarios(input.budgetId);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return budgetService.deleteScenario(input.id);
      }),
  }),
  
  // ============================================================================
  // APPROVALS - Workflow de Aprovação
  // ============================================================================
  
  approvals: router({
    start: protectedProcedure
      .input(z.object({ budgetId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return budgetService.createApprovalWorkflow(input.budgetId, ctx.user.id);
      }),
    
    status: protectedProcedure
      .input(z.object({ budgetId: z.number() }))
      .query(async ({ input }) => {
        return budgetService.getApprovalStatus(input.budgetId);
      }),
    
    approve: protectedProcedure
      .input(z.object({
        approvalId: z.number(),
        comments: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return budgetService.approveStep(input.approvalId, ctx.user.id, input.comments);
      }),
    
    reject: protectedProcedure
      .input(z.object({
        approvalId: z.number(),
        comments: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        return budgetService.rejectStep(input.approvalId, ctx.user.id, input.comments);
      }),
    
    delegate: protectedProcedure
      .input(z.object({
        approvalId: z.number(),
        delegatedTo: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ input }) => {
        return budgetService.delegateApproval(input.approvalId, input.delegatedTo, input.reason);
      }),
  }),
  
  // ============================================================================
  // FORECASTS - Forecast Rolling
  // ============================================================================
  
  forecasts: router({
    list: protectedProcedure
      .input(z.object({ budgetId: z.number() }))
      .query(async ({ input }) => {
        return budgetService.getForecasts(input.budgetId);
      }),
    
    generate: protectedProcedure
      .input(z.object({
        budgetId: z.number(),
        currentMonth: z.number(),
        currentYear: z.number(),
      }))
      .mutation(async ({ input }) => {
        return budgetService.generateRollingForecast(input.budgetId, input.currentMonth, input.currentYear);
      }),
  }),
  
  // ============================================================================
  // INDICATORS - Indicadores Avançados
  // ============================================================================
  
  indicators: router({
    list: protectedProcedure
      .input(z.object({ budgetId: z.number() }))
      .query(async ({ input }) => {
        return budgetService.getIndicators(input.budgetId);
      }),
    
    calculate: protectedProcedure
      .input(z.object({
        budgetId: z.number(),
        month: z.number(),
        year: z.number(),
      }))
      .mutation(async ({ input }) => {
        return budgetService.calculateIndicators(input.budgetId, input.month, input.year);
      }),
  }),
  
  // ============================================================================
  // REVISIONS - Histórico de Revisões
  // ============================================================================
  
  revisions: router({
    list: protectedProcedure
      .input(z.object({ budgetId: z.number() }))
      .query(async ({ input }) => {
        return budgetService.getRevisions(input.budgetId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        budgetId: z.number(),
        budgetLineId: z.number().optional(),
        revisionNumber: z.number(),
        revisionType: z.enum(["criacao", "ajuste", "realocacao", "corte", "suplementacao"]),
        previousValue: z.string().optional(),
        newValue: z.string().optional(),
        reason: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        return budgetService.createRevision({
          ...input,
          createdBy: ctx.user.id,
        });
      }),
  }),
  
  // ============================================================================
  // AI INSIGHTS - Alertas e Insights da IA
  // ============================================================================
  
  insights: router({
    list: protectedProcedure
      .input(z.object({ 
        budgetId: z.number(),
        status: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return budgetService.getAiInsights(input.budgetId, input.status);
      }),
    
    generate: protectedProcedure
      .input(z.object({ budgetId: z.number() }))
      .mutation(async ({ input }) => {
        return budgetService.generateBudgetInsights(input.budgetId);
      }),
    
    resolve: protectedProcedure
      .input(z.object({
        insightId: z.number(),
        resolution: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        return budgetService.resolveInsight(input.insightId, ctx.user.id, input.resolution);
      }),
  }),
  
  // ============================================================================
  // IMPORT - Importação de Histórico
  // ============================================================================
  
  importFromPreviousYear: protectedProcedure
    .input(z.object({
      budgetId: z.number(),
      baseYear: z.number(),
      adjustmentPercent: z.number(),
    }))
    .mutation(async ({ input }) => {
      return budgetService.importFromPreviousYear(input.budgetId, input.baseYear, input.adjustmentPercent);
    }),
  
  // ============================================================================
  // DASHBOARD - Visão Geral
  // ============================================================================
  
  dashboard: protectedProcedure
    .input(z.object({ budgetId: z.number() }))
    .query(async ({ input }) => {
      return budgetService.getBudgetDashboard(input.budgetId);
    }),
});
