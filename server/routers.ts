import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { aiRouter } from "./ai/aiRouter";

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

  // ============================================================================
  // TAREFA 2: PRODUCTION ROUTER
  // ============================================================================
  production: router({
    entries: router({
      list: protectedProcedure
        .input(z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          shift: z.string().optional(),
          skuId: z.number().optional(),
          variation: z.string().optional(),
        }).optional())
        .query(async ({ input }) => {
          return db.getProductionEntries(input);
        }),

      create: protectedProcedure
        .input(z.object({
          productionDate: z.string(),
          shift: z.enum(["manha", "tarde", "noite"]),
          line: z.enum(["linha1", "linha2", "unica"]).optional(),
          responsibleId: z.number().optional(),
          responsibleName: z.string().optional(),
          skuId: z.number(),
          variation: z.enum(["flocos", "medio", "fino"]),
          quantityProduced: z.string(),
          batchNumber: z.string(),
          losses: z.string().optional(),
          lossReason: z.enum(["processo", "qualidade", "equipamento", "materia_prima", "outro"]).optional(),
          observations: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          const id = await db.createProductionEntry({
            ...input,
            productionDate: new Date(input.productionDate),
            createdBy: ctx.user?.id,
            updatedBy: ctx.user?.id,
          });

          // Gerar entrada automática no Estoque PA
          const sku = await db.getSkuById(input.skuId);
          if (sku) {
            const productionDate = new Date(input.productionDate);
            const expirationDate = new Date(productionDate);
            expirationDate.setDate(expirationDate.getDate() + sku.shelfLifeDays);

            // Criar lote no inventário
            const inventoryId = await db.createFinishedGoodsInventory({
              skuId: input.skuId,
              batchNumber: input.batchNumber,
              productionDate: productionDate,
              expirationDate: expirationDate,
              quantity: input.quantityProduced,
              createdBy: ctx.user?.id,
              updatedBy: ctx.user?.id,
            });

            // Atualizar estoque do SKU
            const newStock = Number(sku.currentStock) + Number(input.quantityProduced);
            await db.updateSku(input.skuId, { currentStock: newStock.toString() });

            // Registrar movimento (a função calcula previousStock e newStock automaticamente)
            await db.createFinishedGoodsMovement({
              skuId: input.skuId,
              inventoryId,
              movementType: "entrada",
              quantity: input.quantityProduced,
              batchNumber: input.batchNumber,
              reason: "Produção",
              referenceType: "production_entry",
              referenceId: id,
              createdBy: ctx.user?.id,
            });
          }

          await db.createAuditLog({
            userId: ctx.user?.id,
            userName: ctx.user?.name || undefined,
            action: "RECORD_CREATE",
            module: "production",
            entityType: "production_entry",
            entityId: id,
          });

          return { id };
        }),
    }),

    issues: router({
      list: protectedProcedure
        .input(z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          area: z.string().optional(),
          status: z.string().optional(),
          impact: z.string().optional(),
        }).optional())
        .query(async ({ input }) => {
          return db.getProductionIssues(input);
        }),

      create: protectedProcedure
        .input(z.object({
          occurredAt: z.string(),
          shift: z.enum(["manha", "tarde", "noite"]),
          area: z.enum(["recepcao", "producao", "embalagem", "expedicao", "manutencao"]),
          tags: z.array(z.string()),
          description: z.string(),
          impact: z.enum(["nenhum", "baixo", "medio", "alto", "parada_total"]).optional(),
          downtimeMinutes: z.number().optional(),
          actionTaken: z.string().optional(),
          photoUrl: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          const id = await db.createProductionIssue({
            ...input,
            occurredAt: new Date(input.occurredAt),
            createdBy: ctx.user?.id,
            updatedBy: ctx.user?.id,
          });

          await db.createAuditLog({
            userId: ctx.user?.id,
            userName: ctx.user?.name || undefined,
            action: "RECORD_CREATE",
            module: "production",
            entityType: "production_issue",
            entityId: id,
          });

          return { id };
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          status: z.enum(["aberto", "em_tratamento", "resolvido"]).optional(),
          actionTaken: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          const { id, ...data } = input;
          const updateData: any = { ...data, updatedBy: ctx.user?.id };
          
          if (input.status === "resolvido") {
            updateData.resolvedAt = new Date();
            updateData.resolvedBy = ctx.user?.id;
          }

          await db.updateProductionIssue(id, updateData);

          await db.createAuditLog({
            userId: ctx.user?.id,
            userName: ctx.user?.name || undefined,
            action: "RECORD_EDIT",
            module: "production",
            entityType: "production_issue",
            entityId: id,
          });

          return { success: true };
        }),
    }),
  }),

  // ============================================================================
  // TAREFA 2: PURCHASES ROUTER
  // ============================================================================
  purchases: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        sector: z.string().optional(),
        urgency: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getPurchaseRequests(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const request = await db.getPurchaseRequestById(input.id);
        if (!request) return null;
        
        const items = await db.getPurchaseRequestItems(input.id);
        const quotations = await db.getPurchaseQuotations(input.id);
        
        // Get items for each quotation
        const quotationsWithItems = await Promise.all(
          quotations.map(async (q) => ({
            ...q,
            items: await db.getPurchaseQuotationItems(q.id),
          }))
        );
        
        return { ...request, items, quotations: quotationsWithItems };
      }),

    create: protectedProcedure
      .input(z.object({
        sector: z.enum(["producao", "qualidade", "manutencao", "administrativo", "almoxarifado"]),
        urgency: z.enum(["baixa", "media", "alta", "critica"]),
        deadlineDate: z.string().optional(),
        items: z.array(z.object({
          itemName: z.string(),
          specification: z.string().optional(),
          quantity: z.string(),
          unit: z.string(),
          estimatedValue: z.string().optional(),
          warehouseItemId: z.number().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const requestNumber = await db.getNextPurchaseRequestNumber();
        
        const totalEstimated = input.items.reduce(
          (sum, item) => sum + (Number(item.estimatedValue || 0) * Number(item.quantity)),
          0
        );

        const id = await db.createPurchaseRequest({
          requestNumber,
          sector: input.sector,
          urgency: input.urgency,
          deadlineDate: input.deadlineDate ? new Date(input.deadlineDate) : undefined,
          totalEstimated: totalEstimated.toString(),
          requesterId: ctx.user?.id,
          requesterName: ctx.user?.name || undefined,
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        });

        // Create items
        for (const item of input.items) {
          await db.createPurchaseRequestItem({
            purchaseRequestId: id,
            ...item,
          });
        }

        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: "RECORD_CREATE",
          module: "purchases",
          entityType: "purchase_request",
          entityId: id,
        });

        return { id, requestNumber };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["solicitado", "em_cotacao", "aguardando_aprovacao", "aprovado", "reprovado", "comprado", "entregue", "cancelado"]),
        chosenQuotationId: z.number().optional(),
        rejectionReason: z.string().optional(),
        approvalNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, status, chosenQuotationId, rejectionReason, approvalNotes } = input;
        
        const updateData: any = {
          status,
          updatedBy: ctx.user?.id,
        };

        if (status === "aprovado" && chosenQuotationId) {
          updateData.approvedAt = new Date();
          updateData.approvedBy = ctx.user?.id;
          updateData.chosenQuotationId = chosenQuotationId;
          updateData.approvalNotes = approvalNotes;

          // Mark chosen quotation
          await db.updatePurchaseQuotation(chosenQuotationId, { isChosen: true });

          // Get quotation to create financial provision
          const quotations = await db.getPurchaseQuotations(id);
          const chosenQuotation = quotations.find(q => q.id === chosenQuotationId);
          
          if (chosenQuotation) {
            updateData.totalApproved = chosenQuotation.totalValue;

            // Create financial entry (provision)
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (chosenQuotation.deliveryDays || 30));

            await db.createFinancialEntry({
              entryType: "pagar",
              origin: "compra",
              referenceType: "purchase_request",
              referenceId: id,
              description: `Compra ${(await db.getPurchaseRequestById(id))?.requestNumber}`,
              entityName: chosenQuotation.supplierName,
              value: chosenQuotation.totalValue,
              dueDate: dueDate,
              status: "pendente",
              createdBy: ctx.user?.id,
              updatedBy: ctx.user?.id,
            });
          }
        }

        if (status === "reprovado") {
          updateData.rejectionReason = rejectionReason;
        }

        await db.updatePurchaseRequest(id, updateData);

        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: status === "aprovado" ? "RECORD_APPROVE" : "RECORD_EDIT",
          module: "purchases",
          entityType: "purchase_request",
          entityId: id,
          fieldName: "status",
          newValue: status,
        });

        return { success: true };
      }),

    addQuotation: protectedProcedure
      .input(z.object({
        purchaseRequestId: z.number(),
        supplierName: z.string(),
        supplierCnpj: z.string().optional(),
        supplierContact: z.string().optional(),
        supplierPhone: z.string().optional(),
        supplierEmail: z.string().optional(),
        deliveryDays: z.number().optional(),
        paymentCondition: z.string().optional(),
        observations: z.string().optional(),
        quotationFileUrl: z.string().optional(),
        items: z.array(z.object({
          requestItemId: z.number(),
          unitValue: z.string(),
          totalValue: z.string(),
          deliveryDays: z.string().optional(),
          observations: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const { items, ...quotationData } = input;
        
        const totalValue = items.reduce((sum, item) => sum + Number(item.totalValue), 0);

        const quotationId = await db.createPurchaseQuotation({
          ...quotationData,
          totalValue: totalValue.toString(),
          createdBy: ctx.user?.id,
        });

        for (const item of items) {
          await db.createPurchaseQuotationItem({
            quotationId,
            ...item,
          });
        }

        // Update request status to "em_cotacao" if still "solicitado"
        const request = await db.getPurchaseRequestById(input.purchaseRequestId);
        if (request?.status === "solicitado") {
          await db.updatePurchaseRequest(input.purchaseRequestId, {
            status: "em_cotacao",
            updatedBy: ctx.user?.id,
          });
        }

        return { id: quotationId };
      }),

    getSuggestions: protectedProcedure.query(async () => {
      // Get items below minimum stock
      const productionItems = await db.getWarehouseItems({ warehouseType: "producao", belowMinimum: true });
      const generalItems = await db.getWarehouseItems({ warehouseType: "geral", belowMinimum: true });
      
      return [...productionItems, ...generalItems].map(item => ({
        ...item,
        suggestedQuantity: Number(item.minimumStock) - Number(item.currentStock),
      }));
    }),
  }),

  // ============================================================================
  // TAREFA 2: FINANCIAL ROUTER
  // ============================================================================
  financial: router({
    list: protectedProcedure
      .input(z.object({
        entryType: z.string().optional(),
        origin: z.string().optional(),
        status: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getFinancialEntries(input);
      }),

    create: protectedProcedure
      .input(z.object({
        entryType: z.enum(["pagar", "receber"]),
        origin: z.enum(["produtor", "compra", "venda", "outros"]),
        description: z.string(),
        entityName: z.string().optional(),
        value: z.string(),
        dueDate: z.string(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createFinancialEntry({
          ...input,
          dueDate: new Date(input.dueDate),
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        });

        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: "RECORD_CREATE",
          module: "financial",
          entityType: "financial_entry",
          entityId: id,
        });

        return { id };
      }),

    markAsPaid: protectedProcedure
      .input(z.object({
        id: z.number(),
        paymentMethod: z.enum(["pix", "transferencia", "boleto", "dinheiro", "cheque"]),
        receiptUrl: z.string().optional(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        await db.updateFinancialEntry(id, {
          ...data,
          status: "pago",
          paidAt: new Date(),
          paidBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        });

        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: "RECORD_APPROVE",
          module: "financial",
          entityType: "financial_entry",
          entityId: id,
          fieldName: "status",
          newValue: "pago",
        });

        return { success: true };
      }),

    markAsReceived: protectedProcedure
      .input(z.object({
        id: z.number(),
        paymentMethod: z.enum(["pix", "transferencia", "boleto", "dinheiro", "cheque"]),
        receiptUrl: z.string().optional(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        await db.updateFinancialEntry(id, {
          ...data,
          status: "recebido",
          paidAt: new Date(),
          paidBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        });

        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: "RECORD_APPROVE",
          module: "financial",
          entityType: "financial_entry",
          entityId: id,
          fieldName: "status",
          newValue: "recebido",
        });

        return { success: true };
      }),

    getCashFlow: protectedProcedure
      .input(z.object({ days: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.getCashFlowProjection(input?.days || 30);
      }),
  }),

  // ============================================================================
  // TAREFA 2: QUALITY ROUTER
  // ============================================================================
  quality: router({
    analyses: router({
      list: protectedProcedure
        .input(z.object({
          analysisType: z.string().optional(),
          result: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }).optional())
        .query(async ({ input }) => {
          return db.getQualityAnalyses(input);
        }),

      create: protectedProcedure
        .input(z.object({
          analysisDate: z.string(),
          analysisType: z.enum(["microbiologica", "fisico_quimica", "sensorial", "outra"]),
          relatedTo: z.enum(["carga_coco", "lote_producao", "nenhum"]).optional(),
          referenceId: z.number().optional(),
          skuId: z.number().optional(),
          batchNumber: z.string().optional(),
          parameters: z.string(),
          results: z.string(),
          specificationLimits: z.string().optional(),
          result: z.enum(["conforme", "nao_conforme", "pendente"]),
          responsibleId: z.number().optional(),
          responsibleName: z.string().optional(),
          observations: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          const id = await db.createQualityAnalysis({
            ...input,
            analysisDate: new Date(input.analysisDate),
            createdBy: ctx.user?.id,
            updatedBy: ctx.user?.id,
          });

          await db.createAuditLog({
            userId: ctx.user?.id,
            userName: ctx.user?.name || undefined,
            action: "RECORD_CREATE",
            module: "quality",
            entityType: "quality_analysis",
            entityId: id,
          });

          return { id };
        }),
    }),

    nonConformities: router({
      list: protectedProcedure
        .input(z.object({
          status: z.string().optional(),
          origin: z.string().optional(),
          area: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }).optional())
        .query(async ({ input }) => {
          return db.getNonConformities(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          const nc = await db.getNonConformityById(input.id);
          if (!nc) return null;
          
          const actions = await db.getCorrectiveActions({ nonConformityId: input.id });
          return { ...nc, correctiveActions: actions };
        }),

      create: protectedProcedure
        .input(z.object({
          identificationDate: z.string(),
          origin: z.enum(["analise", "reclamacao_cliente", "auditoria", "processo", "fornecedor"]),
          relatedAnalysisId: z.number().optional(),
          area: z.enum(["recepcao", "producao", "embalagem", "expedicao", "qualidade", "almoxarifado"]),
          description: z.string(),
          affectedProduct: z.string().optional(),
          affectedQuantity: z.string().optional(),
          immediateAction: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          const ncNumber = await db.getNextNCNumber();
          
          const id = await db.createNonConformity({
            ...input,
            ncNumber,
            identificationDate: new Date(input.identificationDate),
            createdBy: ctx.user?.id,
            updatedBy: ctx.user?.id,
          });

          await db.createAuditLog({
            userId: ctx.user?.id,
            userName: ctx.user?.name || undefined,
            action: "RECORD_CREATE",
            module: "quality",
            entityType: "non_conformity",
            entityId: id,
          });

          return { id, ncNumber };
        }),

      updateStatus: protectedProcedure
        .input(z.object({
          id: z.number(),
          status: z.enum(["aberta", "em_analise", "acao_corretiva", "verificacao", "fechada"]),
        }))
        .mutation(async ({ input, ctx }) => {
          const { id, status } = input;
          
          const updateData: any = {
            status,
            updatedBy: ctx.user?.id,
          };

          if (status === "fechada") {
            updateData.closedAt = new Date();
            updateData.closedBy = ctx.user?.id;
          }

          await db.updateNonConformity(id, updateData);

          await db.createAuditLog({
            userId: ctx.user?.id,
            userName: ctx.user?.name || undefined,
            action: "RECORD_EDIT",
            module: "quality",
            entityType: "non_conformity",
            entityId: id,
            fieldName: "status",
            newValue: status,
          });

          return { success: true };
        }),
    }),

    correctiveActions: router({
      list: protectedProcedure
        .input(z.object({
          nonConformityId: z.number().optional(),
          status: z.string().optional(),
        }).optional())
        .query(async ({ input }) => {
          return db.getCorrectiveActions(input);
        }),

      create: protectedProcedure
        .input(z.object({
          nonConformityId: z.number(),
          rootCause: z.string(),
          correctiveAction: z.string(),
          responsibleId: z.number().optional(),
          responsibleName: z.string().optional(),
          deadline: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
          const id = await db.createCorrectiveAction({
            ...input,
            deadline: new Date(input.deadline),
            createdBy: ctx.user?.id,
            updatedBy: ctx.user?.id,
          });

          // Update NC status to "acao_corretiva"
          await db.updateNonConformity(input.nonConformityId, {
            status: "acao_corretiva",
            updatedBy: ctx.user?.id,
          });

          await db.createAuditLog({
            userId: ctx.user?.id,
            userName: ctx.user?.name || undefined,
            action: "RECORD_CREATE",
            module: "quality",
            entityType: "corrective_action",
            entityId: id,
          });

          return { id };
        }),

      updateStatus: protectedProcedure
        .input(z.object({
          id: z.number(),
          status: z.enum(["pendente", "em_andamento", "concluida", "verificada"]),
          effectivenessVerified: z.enum(["sim", "nao"]).optional(),
          verificationNotes: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          const { id, status, effectivenessVerified, verificationNotes } = input;
          
          const updateData: any = {
            status,
            updatedBy: ctx.user?.id,
          };

          if (status === "concluida") {
            updateData.completedAt = new Date();
            updateData.completedBy = ctx.user?.id;
          }

          if (effectivenessVerified) {
            updateData.effectivenessVerified = effectivenessVerified;
            updateData.verificationNotes = verificationNotes;
          }

          await db.updateCorrectiveAction(id, updateData);

          await db.createAuditLog({
            userId: ctx.user?.id,
            userName: ctx.user?.name || undefined,
            action: "RECORD_EDIT",
            module: "quality",
            entityType: "corrective_action",
            entityId: id,
            fieldName: "status",
            newValue: status,
          });

          return { success: true };
        }),
    }),

    stats: protectedProcedure
      .input(z.object({ months: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.getQualityStats(input?.months || 6);
      }),
  }),

  // ============================================================================
  // TAREFA 2: EMPLOYEES ROUTER (Gente & Cultura)
  // ============================================================================
  employees: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        sector: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getEmployees(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const employee = await db.getEmployeeById(input.id);
        if (!employee) return null;
        
        const events = await db.getEmployeeEvents({ employeeId: input.id });
        const notes = await db.getEmployeeNotes({ employeeId: input.id });
        
        return { ...employee, events, notes };
      }),

    create: protectedProcedure
      .input(z.object({
        fullName: z.string(),
        cpf: z.string(),
        birthDate: z.string().optional(),
        position: z.string(),
        sector: z.enum(["recepcao", "producao", "embalagem", "expedicao", "qualidade", "manutencao", "almoxarifado", "administrativo"]),
        admissionDate: z.string(),
        phone: z.string().optional(),
        emergencyContact: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createEmployee({
          ...input,
          birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
          admissionDate: new Date(input.admissionDate),
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        });

        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: "RECORD_CREATE",
          module: "employees",
          entityType: "employee",
          entityId: id,
        });

        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        fullName: z.string().optional(),
        position: z.string().optional(),
        sector: z.enum(["recepcao", "producao", "embalagem", "expedicao", "qualidade", "manutencao", "almoxarifado", "administrativo"]).optional(),
        phone: z.string().optional(),
        emergencyContact: z.string().optional(),
        status: z.enum(["ativo", "afastado", "desligado"]).optional(),
        terminationDate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, terminationDate, ...data } = input;
        
        await db.updateEmployee(id, {
          ...data,
          terminationDate: terminationDate ? new Date(terminationDate) : undefined,
          updatedBy: ctx.user?.id,
        });

        await db.createAuditLog({
          userId: ctx.user?.id,
          userName: ctx.user?.name || undefined,
          action: "RECORD_EDIT",
          module: "employees",
          entityType: "employee",
          entityId: id,
        });

        return { success: true };
      }),

    events: router({
      list: protectedProcedure
        .input(z.object({
          employeeId: z.number().optional(),
          eventType: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }).optional())
        .query(async ({ input }) => {
          return db.getEmployeeEvents(input);
        }),

      create: protectedProcedure
        .input(z.object({
          employeeId: z.number(),
          eventDate: z.string(),
          eventType: z.enum(["falta_justificada", "falta_injustificada", "atraso", "saida_antecipada", "hora_extra", "atestado_medico"]),
          hoursQuantity: z.string().optional(),
          reason: z.string().optional(),
          attachmentUrl: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          const id = await db.createEmployeeEvent({
            ...input,
            eventDate: new Date(input.eventDate),
            createdBy: ctx.user?.id,
          });

          await db.createAuditLog({
            userId: ctx.user?.id,
            userName: ctx.user?.name || undefined,
            action: "RECORD_CREATE",
            module: "employees",
            entityType: "employee_event",
            entityId: id,
          });

          return { id };
        }),
    }),

    notes: router({
      list: protectedProcedure
        .input(z.object({
          employeeId: z.number().optional(),
          noteType: z.string().optional(),
        }).optional())
        .query(async ({ input }) => {
          return db.getEmployeeNotes(input);
        }),

      create: protectedProcedure
        .input(z.object({
          employeeId: z.number(),
          noteDate: z.string(),
          noteType: z.enum(["elogio", "advertencia_verbal", "advertencia_escrita", "feedback", "observacao"]),
          description: z.string(),
          attachmentUrl: z.string().optional(),
          visibility: z.enum(["restrito", "gestores"]),
        }))
        .mutation(async ({ input, ctx }) => {
          const id = await db.createEmployeeNote({
            ...input,
            noteDate: new Date(input.noteDate),
            createdBy: ctx.user?.id,
          });

          await db.createAuditLog({
            userId: ctx.user?.id,
            userName: ctx.user?.name || undefined,
            action: "RECORD_CREATE",
            module: "employees",
            entityType: "employee_note",
            entityId: id,
          });

          return { id };
        }),
    }),

    absenteeismReport: protectedProcedure
      .input(z.object({
        month: z.number().optional(),
        year: z.number().optional(),
        sector: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAbsenteeismReport(input);
      }),
  }),

  // ============================================================================
  // TAREFA 3: ADMINISTRAÇÃO E SEGURANÇA
  // ============================================================================
  admin: router({
    // Gestão de Usuários (apenas CEO/Admin)
    users: router({
      list: protectedProcedure
        .input(z.object({
          status: z.string().optional(),
          role: z.string().optional(),
          search: z.string().optional(),
        }).optional())
        .query(async ({ ctx, input }) => {
          // Verificar se é admin/ceo
          if (ctx.user?.role !== 'ceo' && ctx.user?.role !== 'admin') {
            await db.createAuditLog({
              userId: ctx.user?.id,
              userName: ctx.user?.name || 'Desconhecido',
              action: 'ACCESS_DENIED',
              module: 'administracao',
              entityType: 'users',
            });
            throw new Error('Acesso negado');
          }
          return db.getAllUsers(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
          if (ctx.user?.role !== 'ceo' && ctx.user?.role !== 'admin') {
            throw new Error('Acesso negado');
          }
          return db.getUserById(input.id);
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          role: z.enum(['user', 'admin', 'ceo', 'recebimento', 'producao', 'almox_prod', 'almox_geral', 'qualidade', 'compras', 'financeiro', 'rh', 'consulta']).optional(),
          sector: z.string().optional(),
          status: z.enum(['ativo', 'inativo', 'bloqueado']).optional(),
          accessStartDate: z.string().optional(),
          accessExpirationDate: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== 'ceo' && ctx.user?.role !== 'admin') {
            throw new Error('Acesso negado');
          }
          
          const { id, ...data } = input;
          await db.updateUser(id, data as any);
          
          await db.createAuditLog({
            userId: ctx.user?.id,
            userName: ctx.user?.name || 'Desconhecido',
            action: 'UPDATE',
            module: 'administracao',
            entityType: 'user',
            entityId: id,
            newValue: JSON.stringify(data),
          });
          
          return { success: true };
        }),

      block: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== 'ceo' && ctx.user?.role !== 'admin') {
            throw new Error('Acesso negado');
          }
          
          await db.blockUser(input.id);
          
          await db.createAuditLog({
            userId: ctx.user?.id,
            userName: ctx.user?.name || 'Desconhecido',
            action: 'BLOCK_USER',
            module: 'administracao',
            entityType: 'user',
            entityId: input.id,
          });
          
          // Criar alerta de segurança
          await db.createSecurityAlert({
            alertType: 'login_bloqueado',
            priority: 'alta',
            userId: input.id,
            description: `Usuário bloqueado manualmente por ${ctx.user?.name}`,
          });
          
          return { success: true };
        }),

      unblock: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== 'ceo' && ctx.user?.role !== 'admin') {
            throw new Error('Acesso negado');
          }
          
          await db.unblockUser(input.id);
          
          await db.createAuditLog({
            userId: ctx.user?.id,
            userName: ctx.user?.name || 'Desconhecido',
            action: 'UNBLOCK_USER',
            module: 'administracao',
            entityType: 'user',
            entityId: input.id,
          });
          
          return { success: true };
        }),
    }),

    // Usuários Online
    onlineUsers: router({
      list: protectedProcedure
        .query(async ({ ctx }) => {
          if (ctx.user?.role !== 'ceo' && ctx.user?.role !== 'admin') {
            throw new Error('Acesso negado');
          }
          return db.getOnlineUsers();
        }),

      forceLogout: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== 'ceo' && ctx.user?.role !== 'admin') {
            throw new Error('Acesso negado');
          }
          
          await db.endSession(input.sessionId, 'forcado');
          
          await db.createAuditLog({
            userId: ctx.user?.id,
            userName: ctx.user?.name || 'Desconhecido',
            action: 'FORCE_LOGOUT',
            module: 'administracao',
            entityType: 'session',
            newValue: input.sessionId,
          });
          
          return { success: true };
        }),
    }),

    // Logs de Auditoria
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
        .query(async ({ ctx, input }) => {
          if (ctx.user?.role !== 'ceo' && ctx.user?.role !== 'admin') {
            throw new Error('Acesso negado');
          }
          return db.getAuditLogs(input);
        }),
    }),

    // Alertas de Segurança
    securityAlerts: router({
      list: protectedProcedure
        .input(z.object({
          isRead: z.boolean().optional(),
          priority: z.string().optional(),
          limit: z.number().optional(),
        }).optional())
        .query(async ({ ctx, input }) => {
          if (ctx.user?.role !== 'ceo' && ctx.user?.role !== 'admin') {
            throw new Error('Acesso negado');
          }
          return db.getSecurityAlerts(input);
        }),

      unreadCount: protectedProcedure
        .query(async ({ ctx }) => {
          if (ctx.user?.role !== 'ceo' && ctx.user?.role !== 'admin') {
            return 0;
          }
          return db.getUnreadAlertsCount();
        }),

      markAsRead: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== 'ceo' && ctx.user?.role !== 'admin') {
            throw new Error('Acesso negado');
          }
          await db.markAlertAsRead(input.id, ctx.user?.id || 0);
          return { success: true };
        }),
    }),

    // Configurações do Sistema
    settings: router({
      list: protectedProcedure
        .input(z.object({ category: z.string().optional() }).optional())
        .query(async ({ ctx, input }) => {
          if (ctx.user?.role !== 'ceo' && ctx.user?.role !== 'admin') {
            throw new Error('Acesso negado');
          }
          return db.getSystemSettings(input?.category);
        }),

      get: protectedProcedure
        .input(z.object({ key: z.string() }))
        .query(async ({ ctx, input }) => {
          if (ctx.user?.role !== 'ceo' && ctx.user?.role !== 'admin') {
            throw new Error('Acesso negado');
          }
          return db.getSystemSetting(input.key);
        }),

      update: protectedProcedure
        .input(z.object({
          key: z.string(),
          value: z.string(),
          type: z.enum(['string', 'number', 'boolean', 'json']).optional(),
          category: z.string().optional(),
          description: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== 'ceo' && ctx.user?.role !== 'admin') {
            throw new Error('Acesso negado');
          }
          
          await db.upsertSystemSetting({
            settingKey: input.key,
            settingValue: input.value,
            settingType: input.type || 'string',
            category: input.category || 'geral',
            description: input.description,
            updatedBy: ctx.user?.id,
          });
          
          await db.createAuditLog({
            userId: ctx.user?.id,
            userName: ctx.user?.name || 'Desconhecido',
            action: 'UPDATE',
            module: 'administracao',
            entityType: 'system_setting',
            fieldName: input.key,
            newValue: input.value,
          });
          
          return { success: true };
        }),
    }),

    // Sessões
    sessions: router({
      list: protectedProcedure
        .input(z.object({ userId: z.number().optional() }).optional())
        .query(async ({ ctx, input }) => {
          if (ctx.user?.role !== 'ceo' && ctx.user?.role !== 'admin') {
            throw new Error('Acesso negado');
          }
          return db.getActiveSessions(input);
        }),
    }),
  }),

  // ============================================================================
  // DASHBOARD ROUTER
  // ============================================================================
  dashboard: router({
    stats: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const start = input?.startDate ? new Date(input.startDate) : undefined;
        const end = input?.endDate ? new Date(input.endDate) : undefined;
        return db.getDashboardStats(start, end);
      }),

    productionBySkuVariation: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const start = input?.startDate ? new Date(input.startDate) : undefined;
        const end = input?.endDate ? new Date(input.endDate) : undefined;
        return db.getProductionBySkuVariation(start, end);
      }),

    productionByShift: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const start = input?.startDate ? new Date(input.startDate) : undefined;
        const end = input?.endDate ? new Date(input.endDate) : undefined;
        return db.getProductionByShift(start, end);
      }),

    topProducers: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const start = input?.startDate ? new Date(input.startDate) : undefined;
        const end = input?.endDate ? new Date(input.endDate) : undefined;
        return db.getTopProducersByVolume(start, end, input?.limit);
      }),

    loadsEvolution: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const start = input?.startDate ? new Date(input.startDate) : undefined;
        const end = input?.endDate ? new Date(input.endDate) : undefined;
        return db.getLoadsEvolution(start, end);
      }),

    paymentsByStatus: protectedProcedure
      .query(async () => {
        return db.getPaymentsByStatus();
      }),

    upcomingPayments: protectedProcedure
      .input(z.object({ days: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.getUpcomingPayments(input?.days);
      }),

    stockAlerts: protectedProcedure
      .query(async () => {
        return db.getStockAlerts();
      }),

    expiringProducts: protectedProcedure
      .input(z.object({ days: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.getExpiringProducts(input?.days);
      }),

    ncsByMonth: protectedProcedure
      .input(z.object({ months: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.getNcsByMonth(input?.months);
      }),

    conformityIndex: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const start = input?.startDate ? new Date(input.startDate) : undefined;
        const end = input?.endDate ? new Date(input.endDate) : undefined;
        return db.getConformityIndex(start, end);
      }),
  }),

  // ============================================================================
  // GLOBAL SEARCH ROUTER
  // ============================================================================
  search: router({
    global: protectedProcedure
      .input(z.object({ query: z.string().min(3) }))
      .query(async ({ input }) => {
        return db.globalSearch(input.query);
      }),
  }),

  // ============================================================================
  // AI COPILOT ROUTER
  // ============================================================================
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;

