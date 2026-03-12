/**
 * Router tRPC para Projetos Estratégicos
 * 
 * Este router é ENXUTO — apenas:
 * 1. Validar input com Zod
 * 2. Instanciar o Service
 * 3. Chamar o método do Service
 * 4. Retornar o resultado
 * 
 * TODA lógica de negócio fica no Service, NÃO aqui.
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { StrategicProjectService, StrategicTaskService } from '../services';
import { getStrategicProjectRepository } from '../repositories';

export const strategicRouter = router({
  // ============================================================================
  // PROJETOS
  // ============================================================================
  projects: router({
    list: protectedProcedure
      .input(z.object({
        status: z.enum(['planejamento', 'em_andamento', 'pausado', 'concluido', 'cancelado']).optional(),
        category: z.enum(['equipamento', 'obra', 'insumo', 'processo', 'comercial', 'outro']).optional(),
        priority: z.enum(['baixa', 'media', 'alta', 'critica']).optional(),
        search: z.string().optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().default(50)
      }).optional())
      .query(async ({ input, ctx }) => {
        const service = new StrategicProjectService();
        const filters = input ? {
          status: input.status,
          category: input.category,
          priority: input.priority,
          search: input.search,
        } : {};
        return service.list(ctx.user.id, filters, {
          page: input?.page || 1,
          limit: input?.limit || 50
        });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const service = new StrategicProjectService();
        return service.getById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        category: z.enum(['equipamento', 'obra', 'insumo', 'processo', 'comercial', 'outro']).default('outro'),
        priority: z.enum(['baixa', 'media', 'alta', 'critica']).default('media'),
        budgetPlanned: z.string().optional(),
        startDate: z.string().optional(),
        targetEndDate: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const service = new StrategicProjectService();
        return service.create({
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          budgetPlanned: input.budgetPlanned,
          startDate: input.startDate,
          targetEndDate: input.targetEndDate,
          tags: input.tags,
          ownerId: ctx.user.id,
        }, ctx.user.id);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().nullable().optional(),
        category: z.enum(['equipamento', 'obra', 'insumo', 'processo', 'comercial', 'outro']).optional(),
        priority: z.enum(['baixa', 'media', 'alta', 'critica']).optional(),
        status: z.enum(['planejamento', 'em_andamento', 'pausado', 'concluido', 'cancelado']).optional(),
        budgetPlanned: z.string().nullable().optional(),
        startDate: z.string().nullable().optional(),
        targetEndDate: z.string().nullable().optional(),
        photoUrl: z.string().nullable().optional(),
        tags: z.array(z.string()).nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const service = new StrategicProjectService();
        const { id, ...data } = input;
        return service.update(id, data, ctx.user.id);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const service = new StrategicProjectService();
        await service.delete(input.id, ctx.user.id);
        return { success: true };
      }),

    dashboard: protectedProcedure
      .query(async ({ ctx }) => {
        const service = new StrategicProjectService();
        return service.getDashboard(ctx.user.id);
      })
  }),

  // ============================================================================
  // FASES
  // ============================================================================
  phases: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const repo = getStrategicProjectRepository();
        return repo.findPhasesByProject(input.projectId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number().int().positive(),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        orderIndex: z.number().int().nonnegative().default(0),
        status: z.enum(['pendente', 'em_andamento', 'concluida']).default('pendente'),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const repo = getStrategicProjectRepository();
        return repo.createPhase(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().nullable().optional(),
        orderIndex: z.number().int().nonnegative().optional(),
        status: z.enum(['pendente', 'em_andamento', 'concluida']).optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const repo = getStrategicProjectRepository();
        const { id, ...data } = input;
        return repo.updatePhase(id, data as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const repo = getStrategicProjectRepository();
        await repo.deletePhase(input.id);
        return { success: true };
      }),
  }),

  // ============================================================================
  // MEMBROS
  // ============================================================================
  members: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const repo = getStrategicProjectRepository();
        return repo.findMembersByProject(input.projectId);
      }),
  }),

  // ============================================================================
  // TAREFAS
  // ============================================================================
  tasks: router({
    list: protectedProcedure
      .input(z.object({
        projectId: z.number().int().positive(),
        status: z.enum(['a_fazer', 'em_andamento', 'aguardando', 'concluida', 'cancelada']).optional(),
        phaseId: z.number().int().positive().optional(),
        search: z.string().optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().default(200)
      }))
      .query(async ({ input, ctx }) => {
        const service = new StrategicTaskService();
        return service.list(input.projectId, {
          status: input.status,
          phaseId: input.phaseId,
          search: input.search,
        }, {
          page: input.page,
          limit: input.limit
        }, ctx.user.id);
      }),

    search: protectedProcedure
      .input(z.object({
        search: z.string().min(2),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().default(5),
      }))
      .query(async ({ input }) => {
        const { getStrategicTaskRepository } = await import('../repositories');
        const repo = getStrategicTaskRepository();
        return repo.findAll({ search: input.search }, { page: input.page, limit: input.limit });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const service = new StrategicTaskService();
        return service.getById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number().int().positive(),
        phaseId: z.number().int().positive().optional(),
        parentTaskId: z.number().int().positive().optional(),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        priority: z.enum(['baixa', 'media', 'alta', 'critica']).default('media'),
        estimatedCost: z.string().optional(),
        estimatedHours: z.string().optional(),
        dueDate: z.string().optional(),
        startDate: z.string().optional(),
        assigneeId: z.number().int().positive().optional(),
        assigneeName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const service = new StrategicTaskService();
        return service.create(input, ctx.user.id);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().nullable().optional(),
        priority: z.enum(['baixa', 'media', 'alta', 'critica']).optional(),
        status: z.enum(['a_fazer', 'em_andamento', 'aguardando', 'concluida', 'cancelada']).optional(),
        estimatedCost: z.string().nullable().optional(),
        actualCost: z.string().nullable().optional(),
        estimatedHours: z.string().nullable().optional(),
        actualHours: z.string().nullable().optional(),
        dueDate: z.string().nullable().optional(),
        startDate: z.string().nullable().optional(),
        assigneeId: z.number().int().positive().nullable().optional(),
        assigneeName: z.string().nullable().optional(),
        phaseId: z.number().int().positive().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const service = new StrategicTaskService();
        const { id, ...data } = input;
        return service.update(id, data, ctx.user.id);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const service = new StrategicTaskService();
        await service.delete(input.id, ctx.user.id);
        return { success: true };
      }),

    reorder: protectedProcedure
      .input(z.object({
        projectId: z.number().int().positive(),
        phaseId: z.number().int().positive(),
        taskIds: z.array(z.number().int().positive())
      }))
      .mutation(async ({ input, ctx }) => {
        const service = new StrategicTaskService();
        await service.reorder(input.projectId, input.phaseId, input.taskIds, ctx.user.id);
        return { success: true };
      }),

    todayTasks: protectedProcedure
      .query(async ({ ctx }) => {
        const service = new StrategicTaskService();
        return service.getTodayTasks(ctx.user.id);
      }),

    overdueTasks: protectedProcedure
      .query(async ({ ctx }) => {
        const service = new StrategicTaskService();
        return service.getOverdueTasks(ctx.user.id);
      }),

    bulkUpdateStatus: protectedProcedure
      .input(z.object({
        taskIds: z.array(z.number().int().positive()),
        newStatus: z.enum(['a_fazer', 'em_andamento', 'aguardando', 'concluida', 'cancelada'])
      }))
      .mutation(async ({ input, ctx }) => {
        const service = new StrategicTaskService();
        await service.bulkUpdateStatus(input.taskIds, input.newStatus, ctx.user.id);
        return { success: true };
      }),

    // --- Notas (Diário de Bordo) ---
    getNotes: protectedProcedure
      .input(z.object({ taskId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getStrategicTaskRepository } = await import('../repositories');
        const repo = getStrategicTaskRepository();
        return repo.findNotesByTask(input.taskId);
      }),

    createNote: protectedProcedure
      .input(z.object({
        taskId: z.number().int().positive(),
        projectId: z.number().int().positive(),
        content: z.string().min(1),
        noteType: z.enum(['observacao', 'decisao', 'problema', 'mudanca', 'valor']).default('observacao'),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getStrategicTaskRepository } = await import('../repositories');
        const repo = getStrategicTaskRepository();
        return repo.createNote({
          ...input,
          createdBy: ctx.user.id,
          createdByName: ctx.user.name || 'Usuário',
        });
      }),

    // --- Subtarefas ---
    getSubtasks: protectedProcedure
      .input(z.object({ parentTaskId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getStrategicTaskRepository } = await import('../repositories');
        const repo = getStrategicTaskRepository();
        const result = await repo.findAll({ parentTaskId: input.parentTaskId }, { page: 1, limit: 100 });
        return result.data;
      }),
  })
});

export default strategicRouter;
