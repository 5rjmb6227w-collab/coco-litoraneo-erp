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

export const strategicRouter = router({
  // ============================================================================
  // PROJETOS
  // ============================================================================
  projects: router({
    list: protectedProcedure
      .input(z.object({
        status: z.enum(['planejamento', 'andamento', 'concluido', 'cancelado']).optional(),
        category: z.string().optional(),
        priority: z.enum(['baixa', 'media', 'alta', 'critica']).optional(),
        search: z.string().optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().default(50)
      }).optional())
      .query(async ({ input, ctx }) => {
        const service = new StrategicProjectService();
        return service.list(ctx.user.id, input || {}, {
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
        category: z.string().optional(),
        priority: z.enum(['baixa', 'media', 'alta', 'critica']).default('media'),
        budgetPlanned: z.number().nonnegative().default(0),
        dueDate: z.date().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        const service = new StrategicProjectService();
        return service.create(input, ctx.user.id);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        priority: z.enum(['baixa', 'media', 'alta', 'critica']).optional(),
        status: z.enum(['planejamento', 'andamento', 'concluido', 'cancelado']).optional(),
        budgetPlanned: z.number().nonnegative().optional(),
        dueDate: z.date().optional()
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
  // TAREFAS
  // ============================================================================
  tasks: router({
    list: protectedProcedure
      .input(z.object({
        projectId: z.number().int().positive(),
        status: z.enum(['pendente', 'em_andamento', 'concluida', 'cancelada']).optional(),
        phaseId: z.number().int().positive().optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().default(50)
      }))
      .query(async ({ input, ctx }) => {
        const service = new StrategicTaskService();
        return service.list(input.projectId, {
          status: input.status,
          phaseId: input.phaseId
        }, {
          page: input.page,
          limit: input.limit
        }, ctx.user.id);
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
        phaseId: z.number().int().positive(),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        priority: z.enum(['baixa', 'media', 'alta', 'critica']).default('media'),
        estimatedCost: z.number().nonnegative().default(0),
        dueDate: z.date().optional(),
        assignedTo: z.number().int().positive().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        const service = new StrategicTaskService();
        return service.create(input, ctx.user.id);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        priority: z.enum(['baixa', 'media', 'alta', 'critica']).optional(),
        status: z.enum(['pendente', 'em_andamento', 'concluida', 'cancelada']).optional(),
        estimatedCost: z.number().nonnegative().optional(),
        actualCost: z.number().nonnegative().optional(),
        dueDate: z.date().optional(),
        assignedTo: z.number().int().positive().optional()
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
        newStatus: z.enum(['pendente', 'em_andamento', 'concluida', 'cancelada'])
      }))
      .mutation(async ({ input, ctx }) => {
        const service = new StrategicTaskService();
        await service.bulkUpdateStatus(input.taskIds, input.newStatus, ctx.user.id);
        return { success: true };
      })
  })
});

export default strategicRouter;
