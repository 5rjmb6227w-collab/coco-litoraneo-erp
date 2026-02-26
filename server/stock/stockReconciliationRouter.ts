import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { warehouseItems, warehouseMovements, skus, batches, batchMovements } from "../../drizzle/schema";
import { eq, sql, and, desc } from "drizzle-orm";

// ============================================================================
// STOCK RECONCILIATION ROUTER
// Reconciliação de estoque: verifica e corrige divergências entre saldo
// cacheado (currentStock) e soma real das movimentações
// ============================================================================

export const stockReconciliationRouter = router({
  // -----------------------------------------------------------------------
  // VERIFICAR DIVERGÊNCIAS (sem corrigir)
  // -----------------------------------------------------------------------
  checkWarehouseItems: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;

    // Buscar todos os itens de almoxarifado
    const items = await db.select({
      id: warehouseItems.id,
      internalCode: warehouseItems.internalCode,
      name: warehouseItems.name,
      currentStock: warehouseItems.currentStock,
      unit: warehouseItems.unit,
    }).from(warehouseItems);

    const divergences: Array<{
      id: number;
      code: string;
      name: string;
      unit: string;
      cachedStock: number;
      calculatedStock: number;
      difference: number;
      lastMovementDate: string | null;
    }> = [];

    for (const item of items) {
      // Calcular saldo real somando movimentações
      const [result] = await db.select({
        totalEntradas: sql<string>`COALESCE(SUM(CASE WHEN ${warehouseMovements.movementType} = 'entrada' THEN ${warehouseMovements.quantity} ELSE 0 END), 0)`,
        totalSaidas: sql<string>`COALESCE(SUM(CASE WHEN ${warehouseMovements.movementType} = 'saida' THEN ${warehouseMovements.quantity} ELSE 0 END), 0)`,
        totalAjustes: sql<string>`COALESCE(SUM(CASE WHEN ${warehouseMovements.movementType} = 'ajuste' THEN ${warehouseMovements.quantity} ELSE 0 END), 0)`,
        lastDate: sql<string>`MAX(${warehouseMovements.createdAt})`,
      }).from(warehouseMovements)
        .where(eq(warehouseMovements.warehouseItemId, item.id));

      const calculatedStock = Number(result.totalEntradas) - Number(result.totalSaidas) + Number(result.totalAjustes);
      const cachedStock = Number(item.currentStock);

      if (Math.abs(cachedStock - calculatedStock) > 0.001) {
        divergences.push({
          id: item.id,
          code: item.internalCode,
          name: item.name,
          unit: item.unit,
          cachedStock,
          calculatedStock,
          difference: cachedStock - calculatedStock,
          lastMovementDate: result.lastDate,
        });
      }
    }

    return {
      totalItems: items.length,
      totalDivergences: divergences.length,
      divergences,
      checkedAt: new Date().toISOString(),
    };
  }),

  // -----------------------------------------------------------------------
  // VERIFICAR DIVERGÊNCIAS DE SKUs
  // -----------------------------------------------------------------------
  checkSkus: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;

    const skuList = await db.select({
      id: skus.id,
      code: skus.code,
      description: skus.description,
      currentStock: skus.currentStock,
      category: skus.category,
    }).from(skus);

    const divergences: Array<{
      id: number;
      code: string;
      name: string;
      unit: string;
      cachedStock: number;
      calculatedFromBatches: number;
      difference: number;
    }> = [];

    for (const sku of skuList) {
      // Calcular saldo real a partir dos lotes ativos
      const [result] = await db.select({
        totalAvailable: sql<string>`COALESCE(SUM(${batches.availableQuantity}), 0)`,
      }).from(batches)
        .where(and(
          eq(batches.skuId, sku.id),
          sql`${batches.status} NOT IN ('descartado', 'expirado')`
        ));

      const calculatedStock = Number(result.totalAvailable);
      const cachedStock = Number(sku.currentStock);

      if (Math.abs(cachedStock - calculatedStock) > 0.001) {
        divergences.push({
          id: sku.id,
          code: sku.code,
          name: sku.description,
          unit: sku.category,
          cachedStock,
          calculatedFromBatches: calculatedStock,
          difference: cachedStock - calculatedStock,
        });
      }
    }

    return {
      totalSkus: skuList.length,
      totalDivergences: divergences.length,
      divergences,
      checkedAt: new Date().toISOString(),
    };
  }),

  // -----------------------------------------------------------------------
  // VERIFICAR DIVERGÊNCIAS DE LOTES
  // -----------------------------------------------------------------------
  checkBatches: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;

    const batchList = await db.select({
      id: batches.id,
      code: batches.code,
      skuId: batches.skuId,
      quantity: batches.quantity,
      availableQuantity: batches.availableQuantity,
      status: batches.status,
    }).from(batches)
      .where(sql`${batches.status} NOT IN ('descartado', 'expirado')`);

    const divergences: Array<{
      id: number;
      code: string;
      skuId: number;
      cachedQuantity: number;
      calculatedQuantity: number;
      difference: number;
      status: string;
    }> = [];

    for (const batch of batchList) {
      // Calcular quantidade real a partir das movimentações
      const [result] = await db.select({
        totalIn: sql<string>`COALESCE(SUM(CASE WHEN ${batchMovements.movementType} IN ('producao', 'liberacao') THEN ${batchMovements.quantity} ELSE 0 END), 0)`,
        totalOut: sql<string>`COALESCE(SUM(CASE WHEN ${batchMovements.movementType} IN ('expedicao', 'descarte') THEN ${batchMovements.quantity} ELSE 0 END), 0)`,
      }).from(batchMovements)
        .where(eq(batchMovements.batchId, batch.id));

      const calculatedQuantity = Number(result.totalIn) - Number(result.totalOut);
      const cachedQuantity = Number(batch.availableQuantity);

      if (Math.abs(cachedQuantity - calculatedQuantity) > 0.001) {
        divergences.push({
          id: batch.id,
          code: batch.code,
          skuId: batch.skuId,
          cachedQuantity,
          calculatedQuantity,
          difference: cachedQuantity - calculatedQuantity,
          status: batch.status,
        });
      }
    }

    return {
      totalBatches: batchList.length,
      totalDivergences: divergences.length,
      divergences,
      checkedAt: new Date().toISOString(),
    };
  }),

  // -----------------------------------------------------------------------
  // CORRIGIR DIVERGÊNCIAS DE ALMOXARIFADO
  // -----------------------------------------------------------------------
  fixWarehouseItems: protectedProcedure
    .input(z.object({
      itemIds: z.array(z.number()).optional(), // se vazio, corrige todos
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      let fixed = 0;

      const items = input.itemIds?.length
        ? await db.select().from(warehouseItems).where(sql`${warehouseItems.id} IN (${sql.join(input.itemIds.map(id => sql`${id}`), sql`, `)})`)
        : await db.select().from(warehouseItems);

      for (const item of items) {
        const [result] = await db.select({
          totalEntradas: sql<string>`COALESCE(SUM(CASE WHEN ${warehouseMovements.movementType} = 'entrada' THEN ${warehouseMovements.quantity} ELSE 0 END), 0)`,
          totalSaidas: sql<string>`COALESCE(SUM(CASE WHEN ${warehouseMovements.movementType} = 'saida' THEN ${warehouseMovements.quantity} ELSE 0 END), 0)`,
          totalAjustes: sql<string>`COALESCE(SUM(CASE WHEN ${warehouseMovements.movementType} = 'ajuste' THEN ${warehouseMovements.quantity} ELSE 0 END), 0)`,
        }).from(warehouseMovements)
          .where(eq(warehouseMovements.warehouseItemId, item.id));

        const calculatedStock = Number(result.totalEntradas) - Number(result.totalSaidas) + Number(result.totalAjustes);

        if (Math.abs(Number(item.currentStock) - calculatedStock) > 0.001) {
          await db.update(warehouseItems)
            .set({ currentStock: String(calculatedStock) })
            .where(eq(warehouseItems.id, item.id));
          fixed++;
        }
      }

      return { fixed, checkedAt: new Date().toISOString() };
    }),

  // -----------------------------------------------------------------------
  // CORRIGIR DIVERGÊNCIAS DE SKUs
  // -----------------------------------------------------------------------
  fixSkus: protectedProcedure
    .input(z.object({
      skuIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      let fixed = 0;

      const skuList = input.skuIds?.length
        ? await db.select().from(skus).where(sql`${skus.id} IN (${sql.join(input.skuIds.map(id => sql`${id}`), sql`, `)})`)
        : await db.select().from(skus);

      for (const sku of skuList) {
        const [result] = await db.select({
          totalAvailable: sql<string>`COALESCE(SUM(${batches.availableQuantity}), 0)`,
        }).from(batches)
          .where(and(
            eq(batches.skuId, sku.id),
            sql`${batches.status} NOT IN ('descartado', 'expirado')`
          ));

        const calculatedStock = Number(result.totalAvailable);

        if (Math.abs(Number(sku.currentStock) - calculatedStock) > 0.001) {
          await db.update(skus)
            .set({ currentStock: String(calculatedStock) })
            .where(eq(skus.id, sku.id));
          fixed++;
        }
      }

      return { fixed, checkedAt: new Date().toISOString() };
    }),

  // -----------------------------------------------------------------------
  // RELATÓRIO COMPLETO DE RECONCILIAÇÃO
  // -----------------------------------------------------------------------
  fullReport: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;

    // Contagens gerais
    const [warehouseCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(warehouseItems);
    const [skuCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(skus);
    const [batchCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(batches);
    const [warehouseMovCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(warehouseMovements);
    const [batchMovCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(batchMovements);

    // Últimas movimentações
    const lastWarehouseMov = await db.select({
      date: sql<string>`MAX(${warehouseMovements.createdAt})`,
    }).from(warehouseMovements);

    const lastBatchMov = await db.select({
      date: sql<string>`MAX(${batchMovements.createdAt})`,
    }).from(batchMovements);

    return {
      summary: {
        warehouseItems: warehouseCount.count,
        skus: skuCount.count,
        activeBatches: batchCount.count,
        warehouseMovements: warehouseMovCount.count,
        batchMovements: batchMovCount.count,
        lastWarehouseMovement: lastWarehouseMov[0]?.date || null,
        lastBatchMovement: lastBatchMov[0]?.date || null,
      },
      generatedAt: new Date().toISOString(),
    };
  }),
});
