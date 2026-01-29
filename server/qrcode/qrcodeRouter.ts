import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as qrcodeService from "./qrcodeService";

export const qrcodeRouter = router({
  // Criar QR Code
  create: protectedProcedure
    .input(z.object({
      type: z.enum(["load", "batch", "product", "equipment"]),
      entityId: z.number(),
      metadata: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return qrcodeService.createQRCode(
        input.type as qrcodeService.QRCodeType,
        input.entityId,
        ctx.user?.id,
        input.metadata
      );
    }),

  // Buscar QR Code por código (público para scan)
  getByCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const qrCode = await qrcodeService.getQRCodeByCode(input.code);
      if (!qrCode) {
        return { found: false, qrCode: null };
      }
      return { found: true, qrCode };
    }),

  // Listar QR Codes por entidade
  getByEntity: protectedProcedure
    .input(z.object({
      type: z.enum(["load", "batch", "product", "equipment"]),
      entityId: z.number(),
    }))
    .query(async ({ input }) => {
      return qrcodeService.getQRCodesByEntity(input.type, input.entityId);
    }),

  // Listar todos os QR Codes
  list: protectedProcedure
    .input(z.object({
      type: z.enum(["load", "batch", "product", "equipment"]).optional(),
      active: z.boolean().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return qrcodeService.listQRCodes(input);
    }),

  // Desativar QR Code
  deactivate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return qrcodeService.deactivateQRCode(input.id);
    }),

  // Marcar como impresso
  markPrinted: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return qrcodeService.markAsPrinted(input.id, ctx.user?.id);
    }),

  // Gerar URL da imagem do QR Code
  getImageUrl: publicProcedure
    .input(z.object({
      code: z.string(),
      size: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const scanUrl = qrcodeService.getQRCodeScanUrl(input.code);
      const imageUrl = qrcodeService.getQRCodeImageUrl(scanUrl, input.size);
      return { scanUrl, imageUrl };
    }),

  // Criar QR Codes em lote
  createBatch: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        type: z.enum(["load", "batch", "product", "equipment"]),
        entityId: z.number(),
        metadata: z.record(z.string(), z.any()).optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const results = [];
      for (const item of input.items) {
        const result = await qrcodeService.createQRCode(
          item.type as qrcodeService.QRCodeType,
          item.entityId,
          ctx.user?.id,
          item.metadata
        );
        results.push(result);
      }
      return results;
    }),
});
