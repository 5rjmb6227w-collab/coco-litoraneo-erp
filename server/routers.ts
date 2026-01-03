import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============================================================================
  // PRODUCERS ROUTER
  // ============================================================================
  producers: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getProducers(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getProducerById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        cpfCnpj: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        bank: z.string().optional(),
        agency: z.string().optional(),
        account: z.string().optional(),
        accountType: z.enum(["corrente", "poupanca"]).optional(),
        pixKey: z.string().optional(),
        defaultPricePerKg: z.string(),
        defaultDiscountPercent: z.string().optional(),
        externalCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createProducer({
          ...input,
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        });
        
        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: "RECORD_CREATE",
          module: "producers",
          entityType: "producer",
          entityId: id,
        });
        
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        cpfCnpj: z.string().min(1).optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        bank: z.string().optional(),
        agency: z.string().optional(),
        account: z.string().optional(),
        accountType: z.enum(["corrente", "poupanca"]).optional(),
        pixKey: z.string().optional(),
        defaultPricePerKg: z.string().optional(),
        defaultDiscountPercent: z.string().optional(),
        status: z.enum(["ativo", "inativo"]).optional(),
        externalCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateProducer(id, {
          ...data,
          updatedBy: ctx.user?.id,
        });
        
        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: "RECORD_EDIT",
          module: "producers",
          entityType: "producer",
          entityId: id,
        });
        
        return { success: true };
      }),
  }),

  // ============================================================================
  // COCONUT LOADS ROUTER
  // ============================================================================
  coconutLoads: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        producerId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getCoconutLoads(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getCoconutLoadById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        receivedAt: z.string(),
        producerId: z.number(),
        licensePlate: z.string().min(1),
        driverName: z.string().optional(),
        grossWeight: z.string(),
        tareWeight: z.string(),
        netWeight: z.string(),
        observations: z.string().optional(),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createCoconutLoad({
          ...input,
          receivedAt: new Date(input.receivedAt),
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        });
        
        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: "RECORD_CREATE",
          module: "coconutLoads",
          entityType: "coconut_load",
          entityId: id,
        });
        
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        receivedAt: z.string().optional(),
        producerId: z.number().optional(),
        licensePlate: z.string().optional(),
        driverName: z.string().optional(),
        grossWeight: z.string().optional(),
        tareWeight: z.string().optional(),
        netWeight: z.string().optional(),
        observations: z.string().optional(),
        photoUrl: z.string().optional(),
        status: z.enum(["recebido", "conferido", "fechado"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, receivedAt, ...data } = input;
        
        // Check if load is already closed
        const load = await db.getCoconutLoadById(id);
        if (load?.status === "fechado" && input.status !== "fechado") {
          throw new Error("Carga já fechada não pode ser editada");
        }
        
        const updateData: any = {
          ...data,
          updatedBy: ctx.user?.id,
        };
        
        if (receivedAt) {
          updateData.receivedAt = new Date(receivedAt);
        }
        
        // If closing the load, set closedAt and closedBy
        if (input.status === "fechado" && load?.status !== "fechado") {
          updateData.closedAt = new Date();
          updateData.closedBy = ctx.user?.id;
          
          // Create payable automatically
          const producer = await db.getProducerById(load!.producerId);
          if (producer) {
            const netWeight = Number(load!.netWeight);
            const pricePerKg = Number(producer.defaultPricePerKg);
            const discountPercent = Number(producer.defaultDiscountPercent || 0);
            const discountKg = netWeight * (discountPercent / 100);
            const payableWeight = netWeight - discountKg;
            const totalValue = payableWeight * pricePerKg;
            
            // Set due date to 7 days from now
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7);
            
            await db.createProducerPayable({
              coconutLoadId: id,
              producerId: load!.producerId,
              netWeight: netWeight.toString(),
              pricePerKg: pricePerKg.toString(),
              discountPercent: discountPercent.toString(),
              discountKg: discountKg.toString(),
              payableWeight: payableWeight.toString(),
              totalValue: totalValue.toString(),
              dueDate: dueDate,
              createdBy: ctx.user?.id,
              updatedBy: ctx.user?.id,
            });
          }
        }
        
        await db.updateCoconutLoad(id, updateData);
        
        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: input.status === "fechado" ? "RECORD_APPROVE" : "RECORD_EDIT",
          module: "coconutLoads",
          entityType: "coconut_load",
          entityId: id,
          fieldName: input.status ? "status" : undefined,
          newValue: input.status,
        });
        
        return { success: true };
      }),
  }),

  // ============================================================================
  // PRODUCER PAYABLES ROUTER
  // ============================================================================
  producerPayables: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        producerId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getProducerPayables(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getProducerPayableById(input.id);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        pricePerKg: z.string().optional(),
        discountPercent: z.string().optional(),
        dueDate: z.string().optional(),
        status: z.enum(["pendente", "aprovado", "programado", "pago"]).optional(),
        paymentMethod: z.enum(["pix", "transferencia", "boleto", "dinheiro", "cheque"]).optional(),
        receiptUrl: z.string().optional(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const payable = await db.getProducerPayableById(id);
        
        if (!payable) {
          throw new Error("Pagamento não encontrado");
        }
        
        const updateData: any = {
          ...data,
          updatedBy: ctx.user?.id,
        };
        
        // Recalculate if price or discount changed
        if (input.pricePerKg || input.discountPercent) {
          const netWeight = Number(payable.netWeight);
          const pricePerKg = Number(input.pricePerKg || payable.pricePerKg);
          const discountPercent = Number(input.discountPercent || payable.discountPercent);
          const discountKg = netWeight * (discountPercent / 100);
          const payableWeight = netWeight - discountKg;
          const totalValue = payableWeight * pricePerKg;
          
          updateData.discountKg = discountKg.toString();
          updateData.payableWeight = payableWeight.toString();
          updateData.totalValue = totalValue.toString();
        }
        
        // Track status changes
        if (input.status === "aprovado" && payable.status !== "aprovado") {
          updateData.approvedAt = new Date();
          updateData.approvedBy = ctx.user?.id;
        }
        if (input.status === "programado" && payable.status !== "programado") {
          updateData.scheduledAt = new Date();
          updateData.scheduledBy = ctx.user?.id;
        }
        if (input.status === "pago" && payable.status !== "pago") {
          updateData.paidAt = new Date();
          updateData.paidBy = ctx.user?.id;
        }
        
        await db.updateProducerPayable(id, updateData);
        
        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: input.status ? "RECORD_APPROVE" : "RECORD_EDIT",
          module: "producerPayables",
          entityType: "producer_payable",
          entityId: id,
          fieldName: input.status ? "status" : undefined,
          oldValue: payable.status,
          newValue: input.status,
        });
        
        return { success: true };
      }),
  }),

  // ============================================================================
  // WAREHOUSE ITEMS ROUTER
  // ============================================================================
  warehouseItems: router({
    list: protectedProcedure
      .input(z.object({
        warehouseType: z.string().optional(),
        category: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
        belowMinimum: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getWarehouseItems(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getWarehouseItemById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        internalCode: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        unit: z.enum(["kg", "litro", "unidade", "metro", "rolo"]),
        warehouseType: z.enum(["producao", "geral"]),
        category: z.string().min(1),
        minimumStock: z.string(),
        defaultSupplier: z.string().optional(),
        location: z.string().optional(),
        externalCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createWarehouseItem({
          ...input,
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        });
        
        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: "RECORD_CREATE",
          module: "warehouseItems",
          entityType: "warehouse_item",
          entityId: id,
        });
        
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        internalCode: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        unit: z.enum(["kg", "litro", "unidade", "metro", "rolo"]).optional(),
        category: z.string().optional(),
        minimumStock: z.string().optional(),
        defaultSupplier: z.string().optional(),
        location: z.string().optional(),
        status: z.enum(["ativo", "inativo"]).optional(),
        externalCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateWarehouseItem(id, {
          ...data,
          updatedBy: ctx.user?.id,
        });
        
        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: "RECORD_EDIT",
          module: "warehouseItems",
          entityType: "warehouse_item",
          entityId: id,
        });
        
        return { success: true };
      }),

    getMovements: protectedProcedure
      .input(z.object({ itemId: z.number() }))
      .query(async ({ input }) => {
        return db.getWarehouseMovements(input.itemId);
      }),

    createMovement: protectedProcedure
      .input(z.object({
        warehouseItemId: z.number(),
        movementType: z.enum(["entrada", "saida", "ajuste"]),
        quantity: z.string(),
        reason: z.string().min(1),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createWarehouseMovement({
          ...input,
          createdBy: ctx.user?.id,
        });
        
        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: "RECORD_CREATE",
          module: "warehouseMovements",
          entityType: "warehouse_movement",
          entityId: id,
        });
        
        return { id };
      }),
  }),

  // ============================================================================
  // SKUS ROUTER
  // ============================================================================
  skus: router({
    list: protectedProcedure
      .input(z.object({
        category: z.string().optional(),
        variation: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
        belowMinimum: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getSkus(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getSkuById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        code: z.string().min(1),
        description: z.string().min(1),
        category: z.enum(["seco", "umido", "adocado"]),
        variation: z.enum(["flocos", "medio", "fino"]),
        packageWeight: z.string(),
        packageType: z.string().optional(),
        minimumStock: z.string(),
        shelfLifeDays: z.number(),
        suggestedPrice: z.string().optional(),
        externalCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createSku({
          ...input,
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        });
        
        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: "RECORD_CREATE",
          module: "skus",
          entityType: "sku",
          entityId: id,
        });
        
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().optional(),
        description: z.string().optional(),
        category: z.enum(["seco", "umido", "adocado"]).optional(),
        variation: z.enum(["flocos", "medio", "fino"]).optional(),
        packageWeight: z.string().optional(),
        packageType: z.string().optional(),
        minimumStock: z.string().optional(),
        shelfLifeDays: z.number().optional(),
        suggestedPrice: z.string().optional(),
        status: z.enum(["ativo", "inativo"]).optional(),
        externalCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateSku(id, {
          ...data,
          updatedBy: ctx.user?.id,
        });
        
        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: "RECORD_EDIT",
          module: "skus",
          entityType: "sku",
          entityId: id,
        });
        
        return { success: true };
      }),
  }),

  // ============================================================================
  // FINISHED GOODS INVENTORY ROUTER
  // ============================================================================
  finishedGoods: router({
    listInventory: protectedProcedure
      .input(z.object({
        skuId: z.number().optional(),
        status: z.string().optional(),
        expiringInDays: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getFinishedGoodsInventory(input);
      }),

    createInventory: protectedProcedure
      .input(z.object({
        skuId: z.number(),
        batchNumber: z.string().min(1),
        productionDate: z.string(),
        expirationDate: z.string(),
        quantity: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createFinishedGoodsInventory({
          skuId: input.skuId,
          batchNumber: input.batchNumber,
          productionDate: new Date(input.productionDate),
          expirationDate: new Date(input.expirationDate),
          quantity: input.quantity,
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        });
        
        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: "RECORD_CREATE",
          module: "finishedGoods",
          entityType: "finished_goods_inventory",
          entityId: id,
        });
        
        return { id };
      }),

    createMovement: protectedProcedure
      .input(z.object({
        skuId: z.number(),
        inventoryId: z.number().optional(),
        movementType: z.enum(["entrada", "saida", "ajuste"]),
        quantity: z.string(),
        batchNumber: z.string().optional(),
        reason: z.string().min(1),
        customerDestination: z.string().optional(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createFinishedGoodsMovement({
          skuId: input.skuId,
          inventoryId: input.inventoryId,
          movementType: input.movementType,
          quantity: input.quantity,
          batchNumber: input.batchNumber,
          reason: input.reason,
          customerDestination: input.customerDestination,
          observations: input.observations,
          createdBy: ctx.user?.id,
        });
        
        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: "RECORD_CREATE",
          module: "finishedGoodsMovements",
          entityType: "finished_goods_movement",
          entityId: id,
        });
        
        return { id };
      }),
  }),

  // ============================================================================
  // SEED DATA ROUTER
  // ============================================================================
  seed: router({
    runAll: protectedProcedure.mutation(async () => {
      await db.runAllSeeds();
      return { success: true };
    }),
  }),

  // ============================================================================
  // AUDIT LOGS ROUTER
  // ============================================================================
  auditLogs: router({
    list: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        module: z.string().optional(),
        action: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAuditLogs(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
