import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as alertsService from "./alertsService";

export const alertsRouter = router({
  // Listar alertas com filtros
  list: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return alertsService.getAlerts(input);
    }),

  // Obter alerta por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return alertsService.getAlertById(input.id);
    }),

  // Marcar como lido
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await alertsService.markAlertAsRead(input.id, ctx.user?.id);
      return { success: true };
    }),

  // Resolver alerta
  resolve: protectedProcedure
    .input(z.object({
      id: z.number(),
      resolution: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      await alertsService.resolveAlert(input.id, input.resolution, ctx.user?.id);
      return { success: true };
    }),

  // Ignorar alerta
  ignore: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await alertsService.ignoreAlert(input.id, ctx.user?.id);
      return { success: true };
    }),

  // Estatísticas de alertas
  getStats: protectedProcedure
    .query(async () => {
      return alertsService.getAlertStats();
    }),

  // Gerar alertas automaticamente
  generate: protectedProcedure
    .mutation(async () => {
      return alertsService.generateAllAlerts();
    }),
});
