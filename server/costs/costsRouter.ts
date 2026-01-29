import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

const fixedCostCategories = [
  "aluguel", "energia", "agua", "gas", "internet", "telefone",
  "manutencao", "seguro", "impostos", "salarios", "beneficios",
  "depreciacao", "limpeza", "seguranca", "outros"
] as const;

export const costsRouter = router({
  // Listar custos de produção
  listProductionCosts: protectedProcedure
    .input(z.object({
      limit: z.number().optional(),
      skuId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      return db
        .select()
        .from(schema.productionCosts)
        .orderBy(desc(schema.productionCosts.productionDate))
        .limit(input?.limit || 100);
    }),

  // Criar custo de produção
  createProductionCost: protectedProcedure
    .input(z.object({
      skuId: z.number(),
      productionDate: z.string(),
      quantityProduced: z.number(),
      rawMaterialCost: z.number().optional(),
      packagingCost: z.number().optional(),
      laborCost: z.number().optional(),
      energyCost: z.number().optional(),
      overheadCost: z.number().optional(),
      maintenanceCost: z.number().optional(),
      depreciationCost: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const directCost = 
        (input.rawMaterialCost || 0) +
        (input.packagingCost || 0) +
        (input.laborCost || 0) +
        (input.energyCost || 0);

      const indirectCost =
        (input.overheadCost || 0) +
        (input.maintenanceCost || 0) +
        (input.depreciationCost || 0);

      const totalCost = directCost + indirectCost;
      const unitCost = input.quantityProduced > 0 ? totalCost / input.quantityProduced : 0;

      const [result] = await db.insert(schema.productionCosts).values({
        skuId: input.skuId,
        productionDate: new Date(input.productionDate),
        quantityProduced: input.quantityProduced.toString(),
        rawMaterialCost: (input.rawMaterialCost || 0).toString(),
        packagingCost: (input.packagingCost || 0).toString(),
        laborCost: (input.laborCost || 0).toString(),
        energyCost: (input.energyCost || 0).toString(),
        overheadCost: (input.overheadCost || 0).toString(),
        maintenanceCost: (input.maintenanceCost || 0).toString(),
        depreciationCost: (input.depreciationCost || 0).toString(),
        totalDirectCost: directCost.toString(),
        totalIndirectCost: indirectCost.toString(),
        totalCost: totalCost.toString(),
        unitCost: unitCost.toString(),
        createdBy: ctx.user?.id,
      }).$returningId();

      return { success: true, id: result.id };
    }),

  // Listar custos fixos
  listFixedCosts: protectedProcedure
    .input(z.object({
      active: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(schema.fixedCosts)
        .orderBy(desc(schema.fixedCosts.createdAt));
    }),

  // Criar custo fixo
  createFixedCost: protectedProcedure
    .input(z.object({
      category: z.enum(fixedCostCategories),
      description: z.string(),
      monthlyValue: z.number(),
      effectiveFrom: z.string().optional(),
      observations: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(schema.fixedCosts).values({
        category: input.category,
        description: input.description,
        monthlyValue: input.monthlyValue.toString(),
        effectiveFrom: new Date(input.effectiveFrom || new Date().toISOString().split("T")[0]),
        observations: input.observations,
        createdBy: ctx.user?.id,
      }).$returningId();

      return { success: true, id: result.id };
    }),

  // Obter resumo de custos
  getSummary: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return null;

      const productionCosts = await db.select().from(schema.productionCosts);
      const fixedCosts = await db.select().from(schema.fixedCosts);

      let totalDirectCosts = 0;
      let totalIndirectCosts = 0;
      let totalFixedCosts = 0;

      for (const cost of productionCosts) {
        totalDirectCosts += parseFloat(cost.totalDirectCost || "0");
        totalIndirectCosts += parseFloat(cost.totalIndirectCost || "0");
      }

      for (const cost of fixedCosts) {
        if (cost.active) {
          totalFixedCosts += parseFloat(cost.monthlyValue || "0");
        }
      }

      return {
        totalDirectCosts,
        totalIndirectCosts,
        totalFixedCosts,
        totalCosts: totalDirectCosts + totalIndirectCosts + totalFixedCosts,
        productionCostsCount: productionCosts.length,
        fixedCostsCount: fixedCosts.length,
      };
    }),

  // Atualizar custo fixo
  updateFixedCost: protectedProcedure
    .input(z.object({
      id: z.number(),
      category: z.enum(fixedCostCategories).optional(),
      description: z.string().optional(),
      monthlyValue: z.number().optional(),
      observations: z.string().optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, any> = { updatedBy: ctx.user?.id };
      if (input.category !== undefined) updateData.category = input.category;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.monthlyValue !== undefined) updateData.monthlyValue = input.monthlyValue.toString();
      if (input.observations !== undefined) updateData.observations = input.observations;
      if (input.active !== undefined) updateData.active = input.active;

      await db
        .update(schema.fixedCosts)
        .set(updateData)
        .where(eq(schema.fixedCosts.id, input.id));

      return { success: true };
    }),

  // Deletar custo fixo
  deleteFixedCost: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(schema.fixedCosts)
        .where(eq(schema.fixedCosts.id, input.id));

      return { success: true };
    }),
});
