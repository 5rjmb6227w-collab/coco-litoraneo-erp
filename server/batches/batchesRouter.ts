import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as batchesService from "./batchesService";

export const batchesRouter = router({
  // Listar lotes com filtros
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      skuId: z.number().optional(),
      search: z.string().optional(),
      expiringInDays: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return batchesService.getBatches(input);
    }),

  // Obter lote por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return batchesService.getBatchById(input.id);
    }),

  // Obter lote por código
  getByCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      return batchesService.getBatchByCode(input.code);
    }),

  // Criar novo lote
  create: protectedProcedure
    .input(z.object({
      code: z.string().min(1),
      skuId: z.number(),
      productionOrderId: z.number().optional(),
      quantity: z.string(),
      productionDate: z.string(),
      expirationDate: z.string(),
      status: z.enum(["em_producao", "quarentena", "disponivel", "reservado", "expedido", "vencido", "descartado"]).optional(),
      qualityGrade: z.enum(["A", "B", "C"]).optional(),
      qualityScore: z.string().optional(),
      location: z.string().optional(),
      observations: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await batchesService.createBatch({
        ...input,
        createdBy: ctx.user?.id,
      });
      return { id };
    }),

  // Atualizar lote
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      quantity: z.string().optional(),
      availableQuantity: z.string().optional(),
      status: z.enum(["em_producao", "quarentena", "disponivel", "reservado", "expedido", "vencido", "descartado"]).optional(),
      qualityGrade: z.enum(["A", "B", "C"]).optional(),
      qualityScore: z.string().optional(),
      location: z.string().optional(),
      quarantineReason: z.string().optional(),
      observations: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await batchesService.updateBatch(id, {
        ...data,
        updatedBy: ctx.user?.id,
      });
      return { success: true };
    }),

  // Colocar em quarentena
  quarantine: protectedProcedure
    .input(z.object({
      id: z.number(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      await batchesService.quarantineBatch(input.id, input.reason, ctx.user?.id);
      return { success: true };
    }),

  // Liberar da quarentena
  release: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await batchesService.releaseBatch(input.id, ctx.user?.id);
      return { success: true };
    }),

  // Obter movimentações do lote
  getMovements: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      return batchesService.getBatchMovements(input.batchId);
    }),

  // Estatísticas de lotes
  getStats: protectedProcedure
    .query(async () => {
      return batchesService.getBatchStats();
    }),

  // Rastreabilidade
  getTraceability: protectedProcedure
    .input(z.object({ batchCode: z.string() }))
    .query(async ({ input }) => {
      return batchesService.buildTraceabilityTree(input.batchCode);
    }),
});
