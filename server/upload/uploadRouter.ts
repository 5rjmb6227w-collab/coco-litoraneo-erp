import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import crypto from "crypto";

// ============================================================================
// UPLOAD ROUTER — Gerenciamento de Upload de Arquivos
// Padrão: Router separado por módulo com campos de auditoria
// ============================================================================

function generateRandomSuffix(): string {
  return crypto.randomBytes(6).toString("hex");
}

function getContentType(mimeType: string): string {
  const allowedTypes: Record<string, string> = {
    "image/jpeg": "image/jpeg",
    "image/jpg": "image/jpeg",
    "image/png": "image/png",
    "image/webp": "image/webp",
    "image/gif": "image/gif",
    "application/pdf": "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel": "application/vnd.ms-excel",
    "text/csv": "text/csv",
  };
  return allowedTypes[mimeType] || "application/octet-stream";
}

export const uploadRouter = router({
  // ============================================================================
  // UPLOAD DE ARQUIVO ÚNICO
  // ============================================================================
  uploadFile: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        mimeType: z.string().min(1),
        base64Data: z.string().min(1),
        folder: z.enum([
          "cargas",
          "produtores",
          "pagamentos",
          "equipamentos",
          "qualidade",
          "documentos",
          "compras",
          "producao",
          "geral",
        ]),
        entityType: z.string().optional(), // Ex: "coconut_load", "producer"
        entityId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { fileName, mimeType, base64Data, folder, entityType, entityId } = input;
      const userId = ctx.user?.id;

      // Validar tamanho (base64 → ~33% maior que binário, limite de 16MB binário ≈ 21MB base64)
      const maxBase64Size = 21 * 1024 * 1024; // 21MB em base64
      if (base64Data.length > maxBase64Size) {
        throw new Error("Arquivo excede o tamanho máximo permitido de 16MB");
      }

      // Validar tipo de arquivo
      const contentType = getContentType(mimeType);
      const allowedMimeTypes = [
        "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];
      if (!allowedMimeTypes.includes(mimeType)) {
        throw new Error(`Tipo de arquivo não permitido: ${mimeType}. Tipos aceitos: imagens (JPEG, PNG, WebP, GIF), PDF, Excel, CSV`);
      }

      // Converter base64 para Buffer
      const buffer = Buffer.from(base64Data, "base64");

      // Gerar chave única no S3
      const suffix = generateRandomSuffix();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const extension = sanitizedFileName.split(".").pop() || "bin";
      const baseName = sanitizedFileName.replace(/\.[^.]+$/, "");
      const fileKey = `uploads/${folder}/${baseName}-${suffix}.${extension}`;

      // Upload para S3
      const { url, key } = await storagePut(fileKey, buffer, contentType);

      return {
        url,
        key,
        fileName: sanitizedFileName,
        mimeType: contentType,
        size: buffer.length,
        folder,
        entityType: entityType || null,
        entityId: entityId || null,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
      };
    }),

  // ============================================================================
  // UPLOAD MÚLTIPLO (até 5 arquivos)
  // ============================================================================
  uploadMultiple: protectedProcedure
    .input(
      z.object({
        files: z.array(
          z.object({
            fileName: z.string().min(1),
            mimeType: z.string().min(1),
            base64Data: z.string().min(1),
          })
        ).min(1).max(5),
        folder: z.enum([
          "cargas",
          "produtores",
          "pagamentos",
          "equipamentos",
          "qualidade",
          "documentos",
          "compras",
          "producao",
          "geral",
        ]),
        entityType: z.string().optional(),
        entityId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { files, folder, entityType, entityId } = input;
      const userId = ctx.user?.id;
      const results = [];

      for (const file of files) {
        const contentType = getContentType(file.mimeType);
        const buffer = Buffer.from(file.base64Data, "base64");
        const suffix = generateRandomSuffix();
        const sanitizedFileName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const extension = sanitizedFileName.split(".").pop() || "bin";
        const baseName = sanitizedFileName.replace(/\.[^.]+$/, "");
        const fileKey = `uploads/${folder}/${baseName}-${suffix}.${extension}`;

        const { url, key } = await storagePut(fileKey, buffer, contentType);

        results.push({
          url,
          key,
          fileName: sanitizedFileName,
          mimeType: contentType,
          size: buffer.length,
          folder,
          entityType: entityType || null,
          entityId: entityId || null,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        });
      }

      return results;
    }),
});
