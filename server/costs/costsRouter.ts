import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import * as schema from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql, asc, inArray } from "drizzle-orm";

const fixedCostCategories = [
  "aluguel", "energia", "agua", "gas", "internet", "telefone",
  "manutencao", "seguro", "impostos", "salarios", "beneficios",
  "depreciacao", "limpeza", "seguranca", "outros"
] as const;

const costCenterTypes = ["producao", "manutencao", "administrativo", "qualidade", "logistica"] as const;
const indirectCostCategories = ["energia", "manutencao", "limpeza_cip", "epis_uniformes", "depreciacao", "aluguel", "agua", "gas", "outros"] as const;
const alertTypes = ["aumento", "reducao"] as const;
const periodStatuses = ["rascunho", "confirmado", "fechado"] as const;
const freightTypes = ["valor_fixo", "formula"] as const;
const regions = ["norte", "nordeste", "centro_oeste", "sudeste", "sul"] as const;

export const costsRouter = router({
  // ============================================================================
  // COST CENTERS
  // ============================================================================
  costCenters: router({
    list: protectedProcedure
      .input(z.object({
        status: z.enum(["ativo", "inativo"]).optional(),
        type: z.enum(costCenterTypes).optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const conditions = [];
        if (input?.status) {
          conditions.push(eq(schema.costCenters.status, input.status));
        }
        if (input?.type) {
          conditions.push(eq(schema.costCenters.type, input.type));
        }
        
        const query = db.select().from(schema.costCenters);
        if (conditions.length > 0) {
          return query.where(and(...conditions)).orderBy(asc(schema.costCenters.code));
        }
        return query.orderBy(asc(schema.costCenters.code));
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        
        const [result] = await db
          .select()
          .from(schema.costCenters)
          .where(eq(schema.costCenters.id, input.id));
        return result || null;
      }),

    create: protectedProcedure
      .input(z.object({
        code: z.string().min(1).max(20),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        type: z.enum(costCenterTypes),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(schema.costCenters).values({
          code: input.code,
          name: input.name,
          description: input.description || null,
          type: input.type,
          status: "ativo",
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        }).$returningId();
        
        return { success: true, id: result.id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().min(1).max(20).optional(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        type: z.enum(costCenterTypes).optional(),
        status: z.enum(["ativo", "inativo"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const updateData: Record<string, any> = { updatedBy: ctx.user?.id };
        if (input.code !== undefined) updateData.code = input.code;
        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.type !== undefined) updateData.type = input.type;
        if (input.status !== undefined) updateData.status = input.status;
        
        await db.update(schema.costCenters)
          .set(updateData)
          .where(eq(schema.costCenters.id, input.id));
        
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(schema.costCenters)
          .where(eq(schema.costCenters.id, input.id));
        
        return { success: true };
      }),
  }),

  // ============================================================================
  // MONTHLY INDIRECT COSTS
  // ============================================================================
  indirectCosts: router({
    list: protectedProcedure
      .input(z.object({
        period: z.string().optional(),
        costCenterId: z.number().optional(),
        category: z.enum(indirectCostCategories).optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const conditions = [];
        if (input?.period) {
          conditions.push(eq(schema.monthlyIndirectCosts.period, input.period));
        }
        if (input?.costCenterId) {
          conditions.push(eq(schema.monthlyIndirectCosts.costCenterId, input.costCenterId));
        }
        if (input?.category) {
          conditions.push(eq(schema.monthlyIndirectCosts.category, input.category));
        }
        
        const query = db.select().from(schema.monthlyIndirectCosts);
        if (conditions.length > 0) {
          return query.where(and(...conditions)).orderBy(desc(schema.monthlyIndirectCosts.createdAt));
        }
        return query.orderBy(desc(schema.monthlyIndirectCosts.createdAt));
      }),

    getByPeriod: protectedProcedure
      .input(z.object({ period: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        return db.select().from(schema.monthlyIndirectCosts)
          .where(eq(schema.monthlyIndirectCosts.period, input.period))
          .orderBy(asc(schema.monthlyIndirectCosts.category));
      }),

    create: protectedProcedure
      .input(z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/),
        costCenterId: z.number().optional(),
        category: z.enum(indirectCostCategories),
        description: z.string().min(1),
        value: z.number().min(0),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(schema.monthlyIndirectCosts).values({
          period: input.period,
          costCenterId: input.costCenterId || null,
          category: input.category,
          description: input.description,
          value: input.value.toFixed(2),
          observations: input.observations || null,
          status: "rascunho",
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        }).$returningId();
        
        return { success: true, id: result.id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        costCenterId: z.number().nullable().optional(),
        category: z.enum(indirectCostCategories).optional(),
        description: z.string().optional(),
        value: z.number().min(0).optional(),
        observations: z.string().optional(),
        status: z.enum(periodStatuses).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const updateData: Record<string, any> = { updatedBy: ctx.user?.id };
        if (input.costCenterId !== undefined) updateData.costCenterId = input.costCenterId;
        if (input.category !== undefined) updateData.category = input.category;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.value !== undefined) updateData.value = input.value.toFixed(2);
        if (input.observations !== undefined) updateData.observations = input.observations;
        if (input.status !== undefined) updateData.status = input.status;
        
        await db.update(schema.monthlyIndirectCosts)
          .set(updateData)
          .where(eq(schema.monthlyIndirectCosts.id, input.id));
        
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(schema.monthlyIndirectCosts)
          .where(eq(schema.monthlyIndirectCosts.id, input.id));
        
        return { success: true };
      }),

    // Importar custos de mão de obra do módulo de RH
    importLaborCosts: protectedProcedure
      .input(z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/),
        costCenterId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Buscar todos os colaboradores ativos
        const employees = await db.select().from(schema.employees)
          .where(eq(schema.employees.status, "ativo"));
        
        let totalLaborCost = 0;
        const laborDetails: any[] = [];
        
        for (const emp of employees) {
          const baseSalary = parseFloat(emp.baseSalary || "0");
          let employeeCost = baseSalary;
          const breakdown: Record<string, number> = { salarioBase: baseSalary };
          
          // Calcular encargos conforme configuração
          if (emp.fgtsEnabled) {
            const fgts = baseSalary * (parseFloat(emp.fgtsPercent || "8") / 100);
            employeeCost += fgts;
            breakdown.fgts = fgts;
          }
          if (emp.inssPatronalEnabled) {
            const inss = baseSalary * (parseFloat(emp.inssPatronalPercent || "20") / 100);
            employeeCost += inss;
            breakdown.inssPatronal = inss;
          }
          if (emp.vacationProvisionEnabled) {
            const ferias = baseSalary * (parseFloat(emp.vacationProvisionPercent || "8.33") / 100);
            employeeCost += ferias;
            breakdown.provisaoFerias = ferias;
          }
          if (emp.vacationBonusEnabled) {
            const tercoFerias = baseSalary * (parseFloat(emp.vacationBonusPercent || "2.78") / 100);
            employeeCost += tercoFerias;
            breakdown.tercoFerias = tercoFerias;
          }
          if (emp.thirteenthSalaryEnabled) {
            const decimo = baseSalary * (parseFloat(emp.thirteenthSalaryPercent || "8.33") / 100);
            employeeCost += decimo;
            breakdown.decimoTerceiro = decimo;
          }
          if (emp.ratEnabled) {
            const rat = baseSalary * (parseFloat(emp.ratPercent || "3") / 100);
            employeeCost += rat;
            breakdown.rat = rat;
          }
          if (emp.otherLaborCostsEnabled) {
            const outros = parseFloat(emp.otherLaborCosts || "0");
            employeeCost += outros;
            breakdown.outros = outros;
          }
          
          totalLaborCost += employeeCost;
          laborDetails.push({
            employeeId: emp.id,
            employeeName: emp.fullName,
            sector: emp.sector,
            position: emp.position,
            totalCost: employeeCost,
            breakdown,
          });
        }
        
        // Verificar se já existe registro de mão de obra para este período
        const existing = await db.select().from(schema.monthlyIndirectCosts)
          .where(and(
            eq(schema.monthlyIndirectCosts.period, input.period),
            eq(schema.monthlyIndirectCosts.category, "outros"),
            sql`${schema.monthlyIndirectCosts.description} LIKE '%Mão de Obra%'`
          ));
        
        if (existing.length > 0) {
          // Atualizar registro existente
          await db.update(schema.monthlyIndirectCosts)
            .set({
              value: totalLaborCost.toFixed(2),
              description: `Mão de Obra - ${employees.length} colaboradores`,
              observations: `Importado automaticamente do módulo de RH. Detalhes: ${JSON.stringify(laborDetails)}`,
              updatedBy: ctx.user?.id,
            })
            .where(eq(schema.monthlyIndirectCosts.id, existing[0].id));
          
          return { success: true, id: existing[0].id, totalLaborCost, employeeCount: employees.length, details: laborDetails };
        } else {
          // Criar novo registro
          const [result] = await db.insert(schema.monthlyIndirectCosts).values({
            period: input.period,
            costCenterId: input.costCenterId || null,
            category: "outros",
            description: `Mão de Obra - ${employees.length} colaboradores`,
            value: totalLaborCost.toFixed(2),
            observations: `Importado automaticamente do módulo de RH. Detalhes: ${JSON.stringify(laborDetails)}`,
            status: "rascunho",
            createdBy: ctx.user?.id,
            updatedBy: ctx.user?.id,
          }).$returningId();
          
          return { success: true, id: result.id, totalLaborCost, employeeCount: employees.length, details: laborDetails };
        }
      }),

    // Obter total por categoria para um período
    getTotalsByCategory: protectedProcedure
      .input(z.object({ period: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const costs = await db.select().from(schema.monthlyIndirectCosts)
          .where(eq(schema.monthlyIndirectCosts.period, input.period));
        
        const totals: Record<string, number> = {};
        for (const cost of costs) {
          const category = cost.category;
          const amount = parseFloat(cost.value || "0");
          totals[category] = (totals[category] || 0) + amount;
        }
        
        return Object.entries(totals).map(([category, total]) => ({
          category,
          total,
        }));
      }),
  }),

  // ============================================================================
  // SHIPPING DESTINATIONS (FREIGHT & TAXES)
  // ============================================================================
  destinations: router({
    list: protectedProcedure
      .input(z.object({
        status: z.enum(["ativo", "inativo"]).optional(),
        state: z.string().optional(),
        region: z.enum(regions).optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const conditions = [];
        if (input?.status) {
          conditions.push(eq(schema.shippingDestinations.status, input.status));
        }
        if (input?.state) {
          conditions.push(eq(schema.shippingDestinations.state, input.state));
        }
        if (input?.region) {
          conditions.push(eq(schema.shippingDestinations.region, input.region));
        }
        
        const query = db.select().from(schema.shippingDestinations);
        if (conditions.length > 0) {
          return query.where(and(...conditions)).orderBy(asc(schema.shippingDestinations.name));
        }
        return query.orderBy(asc(schema.shippingDestinations.name));
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        
        const [result] = await db.select().from(schema.shippingDestinations)
          .where(eq(schema.shippingDestinations.id, input.id));
        return result || null;
      }),

    create: protectedProcedure
      .input(z.object({
        code: z.string().min(1).max(20),
        name: z.string().min(1).max(255),
        state: z.string().length(2),
        city: z.string().max(255).optional(),
        region: z.enum(regions),
        freightType: z.enum(freightTypes),
        freightFixedValue: z.number().optional(),
        freightFormula: z.string().optional(),
        freightFormulaDescription: z.string().optional(),
        taxType: z.enum(freightTypes).optional(),
        taxFixedValue: z.number().optional(),
        taxFormula: z.string().optional(),
        taxFormulaDescription: z.string().optional(),
        icmsPercent: z.number().optional(),
        icmsStPercent: z.number().optional(),
        pisPercent: z.number().optional(),
        cofinsPercent: z.number().optional(),
        ipiPercent: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(schema.shippingDestinations).values({
          code: input.code,
          name: input.name,
          state: input.state,
          city: input.city || null,
          region: input.region,
          freightType: input.freightType,
          freightFixedValue: (input.freightFixedValue || 0).toFixed(2),
          freightFormula: input.freightFormula || null,
          freightFormulaDescription: input.freightFormulaDescription || null,
          taxType: input.taxType || "formula",
          taxFixedValue: (input.taxFixedValue || 0).toFixed(2),
          taxFormula: input.taxFormula || null,
          taxFormulaDescription: input.taxFormulaDescription || null,
          icmsPercent: (input.icmsPercent || 0).toFixed(2),
          icmsStPercent: (input.icmsStPercent || 0).toFixed(2),
          pisPercent: (input.pisPercent || 1.65).toFixed(2),
          cofinsPercent: (input.cofinsPercent || 7.60).toFixed(2),
          ipiPercent: (input.ipiPercent || 0).toFixed(2),
          status: "ativo",
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        }).$returningId();
        
        return { success: true, id: result.id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().min(1).max(20).optional(),
        name: z.string().min(1).max(255).optional(),
        state: z.string().length(2).optional(),
        city: z.string().max(255).nullable().optional(),
        region: z.enum(regions).optional(),
        freightType: z.enum(freightTypes).optional(),
        freightFixedValue: z.number().nullable().optional(),
        freightFormula: z.string().nullable().optional(),
        freightFormulaDescription: z.string().nullable().optional(),
        taxType: z.enum(freightTypes).optional(),
        taxFixedValue: z.number().nullable().optional(),
        taxFormula: z.string().nullable().optional(),
        taxFormulaDescription: z.string().nullable().optional(),
        icmsPercent: z.number().optional(),
        icmsStPercent: z.number().optional(),
        pisPercent: z.number().optional(),
        cofinsPercent: z.number().optional(),
        ipiPercent: z.number().optional(),
        status: z.enum(["ativo", "inativo"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const updateData: Record<string, any> = { updatedBy: ctx.user?.id };
        if (input.code !== undefined) updateData.code = input.code;
        if (input.name !== undefined) updateData.name = input.name;
        if (input.state !== undefined) updateData.state = input.state;
        if (input.city !== undefined) updateData.city = input.city;
        if (input.region !== undefined) updateData.region = input.region;
        if (input.freightType !== undefined) updateData.freightType = input.freightType;
        if (input.freightFixedValue !== undefined) updateData.freightFixedValue = input.freightFixedValue?.toFixed(2);
        if (input.freightFormula !== undefined) updateData.freightFormula = input.freightFormula;
        if (input.freightFormulaDescription !== undefined) updateData.freightFormulaDescription = input.freightFormulaDescription;
        if (input.taxType !== undefined) updateData.taxType = input.taxType;
        if (input.taxFixedValue !== undefined) updateData.taxFixedValue = input.taxFixedValue?.toFixed(2);
        if (input.taxFormula !== undefined) updateData.taxFormula = input.taxFormula;
        if (input.taxFormulaDescription !== undefined) updateData.taxFormulaDescription = input.taxFormulaDescription;
        if (input.icmsPercent !== undefined) updateData.icmsPercent = input.icmsPercent.toFixed(2);
        if (input.icmsStPercent !== undefined) updateData.icmsStPercent = input.icmsStPercent.toFixed(2);
        if (input.pisPercent !== undefined) updateData.pisPercent = input.pisPercent.toFixed(2);
        if (input.cofinsPercent !== undefined) updateData.cofinsPercent = input.cofinsPercent.toFixed(2);
        if (input.ipiPercent !== undefined) updateData.ipiPercent = input.ipiPercent.toFixed(2);
        if (input.status !== undefined) updateData.status = input.status;
        
        await db.update(schema.shippingDestinations)
          .set(updateData)
          .where(eq(schema.shippingDestinations.id, input.id));
        
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(schema.shippingDestinations)
          .where(eq(schema.shippingDestinations.id, input.id));
        
        return { success: true };
      }),

    // Calcular frete e impostos para um destino
    calculate: protectedProcedure
      .input(z.object({
        destinationId: z.number(),
        weight: z.number(),
        value: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        
        const [destination] = await db.select().from(schema.shippingDestinations)
          .where(eq(schema.shippingDestinations.id, input.destinationId));
        
        if (!destination) return null;
        
        let freightCost = 0;
        
        if (destination.freightType === "valor_fixo") {
          freightCost = parseFloat(destination.freightFixedValue || "0");
        } else if (destination.freightFormula) {
          // Avaliar fórmula simples (ex: "peso * 2.5" ou "valor * 0.05")
          try {
            const formula = destination.freightFormula
              .replace(/peso/gi, input.weight.toString())
              .replace(/weight/gi, input.weight.toString())
              .replace(/valor/gi, input.value.toString())
              .replace(/value/gi, input.value.toString());
            freightCost = eval(formula);
          } catch {
            freightCost = 0;
          }
        }
        
        // Calcular impostos
        const icms = input.value * (parseFloat(destination.icmsPercent || "0") / 100);
        const icmsSt = input.value * (parseFloat(destination.icmsStPercent || "0") / 100);
        const pis = input.value * (parseFloat(destination.pisPercent || "1.65") / 100);
        const cofins = input.value * (parseFloat(destination.cofinsPercent || "7.60") / 100);
        const ipi = input.value * (parseFloat(destination.ipiPercent || "0") / 100);
        
        const totalTax = icms + icmsSt + pis + cofins + ipi;
        
        return {
          destinationId: input.destinationId,
          destinationName: destination.name,
          state: destination.state,
          region: destination.region,
          weight: input.weight,
          value: input.value,
          freightCost,
          taxes: {
            icms,
            icmsSt,
            pis,
            cofins,
            ipi,
            total: totalTax,
          },
          totalCost: freightCost + totalTax,
        };
      }),
  }),

  // ============================================================================
  // COST RECORDS (Main cost calculations)
  // ============================================================================
  records: router({
    list: protectedProcedure
      .input(z.object({
        skuId: z.number().optional(),
        period: z.string().optional(),
        status: z.enum(periodStatuses).optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const conditions = [];
        if (input?.skuId) {
          conditions.push(eq(schema.costRecords.skuId, input.skuId));
        }
        if (input?.period) {
          conditions.push(eq(schema.costRecords.period, input.period));
        }
        if (input?.status) {
          conditions.push(eq(schema.costRecords.status, input.status));
        }
        
        let query = db.select().from(schema.costRecords);
        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as any;
        }
        
        return query.orderBy(desc(schema.costRecords.createdAt)).limit(input?.limit || 100);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        
        const [result] = await db.select().from(schema.costRecords)
          .where(eq(schema.costRecords.id, input.id));
        return result || null;
      }),

    // Calcular custo para um SKU (Smart Cost Calculator)
    calculate: protectedProcedure
      .input(z.object({
        skuId: z.number(),
        period: z.string().regex(/^\d{4}-\d{2}$/),
        quantityProduced: z.number().min(0.01),
        destinationId: z.number().optional(),
        wastagePercent: z.number().optional(),
        sellingPrice: z.number().optional(),
        observations: z.string().optional(),
        saveRecord: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // 1. Buscar SKU
        const [sku] = await db.select().from(schema.skus)
          .where(eq(schema.skus.id, input.skuId));
        if (!sku) throw new Error("SKU não encontrado");
        
        // 2. Buscar BOM do SKU para calcular custo de materiais diretos
        const bomItems = await db.select().from(schema.bomItems)
          .where(eq(schema.bomItems.skuId, input.skuId));
        
        let directCostTotal = 0;
        const directCostDetails: any[] = [];
        
        for (const item of bomItems) {
          // Buscar custo unitário do item no almoxarifado
          const [warehouseItem] = await db.select().from(schema.warehouseItems)
            .where(eq(schema.warehouseItems.id, item.itemId));
          
          if (warehouseItem) {
            const unitCost = parseFloat(warehouseItem.unitCost || "0");
            const quantity = parseFloat(item.quantityPerUnit || "0");
            const itemCost = unitCost * quantity * input.quantityProduced;
            directCostTotal += itemCost;
            
            directCostDetails.push({
              itemId: item.itemId,
              itemName: item.itemName,
              itemCode: warehouseItem.internalCode,
              quantityPerUnit: quantity,
              totalQuantity: quantity * input.quantityProduced,
              unitCost,
              totalCost: itemCost,
            });
          }
        }
        
        // 3. Calcular custo de mão de obra direta (proporcional ao volume de produção)
        const employees = await db.select().from(schema.employees)
          .where(eq(schema.employees.status, "ativo"));
        
        let laborCostTotal = 0;
        const laborCostDetails: any[] = [];
        
        for (const emp of employees) {
          const baseSalary = parseFloat(emp.baseSalary || "0");
          let employeeCost = baseSalary;
          
          if (emp.fgtsEnabled) employeeCost += baseSalary * (parseFloat(emp.fgtsPercent || "8") / 100);
          if (emp.inssPatronalEnabled) employeeCost += baseSalary * (parseFloat(emp.inssPatronalPercent || "20") / 100);
          if (emp.vacationProvisionEnabled) employeeCost += baseSalary * (parseFloat(emp.vacationProvisionPercent || "8.33") / 100);
          if (emp.vacationBonusEnabled) employeeCost += baseSalary * (parseFloat(emp.vacationBonusPercent || "2.78") / 100);
          if (emp.thirteenthSalaryEnabled) employeeCost += baseSalary * (parseFloat(emp.thirteenthSalaryPercent || "8.33") / 100);
          if (emp.ratEnabled) employeeCost += baseSalary * (parseFloat(emp.ratPercent || "3") / 100);
          if (emp.otherLaborCostsEnabled) employeeCost += parseFloat(emp.otherLaborCosts || "0");
          
          laborCostTotal += employeeCost;
          laborCostDetails.push({
            employeeId: emp.id,
            employeeName: emp.fullName,
            sector: emp.sector,
            position: emp.position,
            totalCost: employeeCost,
          });
        }
        
        // 4. Buscar custos indiretos do período
        const indirectCosts = await db.select().from(schema.monthlyIndirectCosts)
          .where(eq(schema.monthlyIndirectCosts.period, input.period));
        
        let indirectCostTotal = 0;
        const indirectCostDetails: any[] = [];
        
        for (const cost of indirectCosts) {
          const amount = parseFloat(cost.value || "0");
          indirectCostTotal += amount;
          indirectCostDetails.push({
            category: cost.category,
            description: cost.description,
            amount,
          });
        }
        
        // 5. Calcular frete e impostos (se destino especificado)
        let freightCost = 0;
        let taxCost = 0;
        
        if (input.destinationId) {
          const [destination] = await db.select().from(schema.shippingDestinations)
            .where(eq(schema.shippingDestinations.id, input.destinationId));
          
          if (destination) {
            const packageWeight = parseFloat(sku.packageWeight || "1");
            const totalWeight = packageWeight * input.quantityProduced;
            const estimatedValue = (input.sellingPrice || parseFloat(sku.suggestedPrice || "0")) * input.quantityProduced;
            
            if (destination.freightType === "valor_fixo") {
              freightCost = parseFloat(destination.freightFixedValue || "0");
            } else if (destination.freightFormula) {
              try {
                const formula = destination.freightFormula
                  .replace(/peso/gi, totalWeight.toString())
                  .replace(/weight/gi, totalWeight.toString())
                  .replace(/valor/gi, estimatedValue.toString())
                  .replace(/value/gi, estimatedValue.toString());
                freightCost = eval(formula);
              } catch {
                freightCost = 0;
              }
            }
            
            // Calcular impostos
            const icms = estimatedValue * (parseFloat(destination.icmsPercent || "0") / 100);
            const pis = estimatedValue * (parseFloat(destination.pisPercent || "1.65") / 100);
            const cofins = estimatedValue * (parseFloat(destination.cofinsPercent || "7.60") / 100);
            const ipi = estimatedValue * (parseFloat(destination.ipiPercent || "0") / 100);
            
            taxCost = icms + pis + cofins + ipi;
          }
        }
        
        // 6. Calcular custo de perdas/refugo
        const wastagePercent = input.wastagePercent || 0;
        const subtotal = directCostTotal + laborCostTotal + indirectCostTotal + freightCost + taxCost;
        const wastageValue = subtotal * (wastagePercent / 100);
        
        // 7. Calcular custo total e unitário
        const totalCost = subtotal + wastageValue;
        const unitCost = totalCost / input.quantityProduced;
        
        // 8. Calcular margem bruta
        const sellingPrice = input.sellingPrice || parseFloat(sku.suggestedPrice || "0");
        const grossMargin = sellingPrice > 0 ? (sellingPrice - unitCost) : 0;
        const grossMarginPercent = sellingPrice > 0 ? (grossMargin / sellingPrice) * 100 : 0;
        
        // 9. Salvar registro se solicitado
        let recordId = null;
        if (input.saveRecord !== false) {
          const [result] = await db.insert(schema.costRecords).values({
            period: input.period,
            skuId: input.skuId,
            quantityProduced: input.quantityProduced.toFixed(2),
            unit: "kg",
            directCostTotal: directCostTotal.toFixed(2),
            directCostDetails: JSON.stringify(directCostDetails),
            indirectCostTotal: indirectCostTotal.toFixed(2),
            indirectCostDetails: JSON.stringify(indirectCostDetails),
            laborCostTotal: laborCostTotal.toFixed(2),
            laborCostDetails: JSON.stringify(laborCostDetails),
            destinationId: input.destinationId || null,
            freightCost: freightCost.toFixed(2),
            taxCost: taxCost.toFixed(2),
            wastagePercent: wastagePercent.toFixed(2),
            wastageValue: wastageValue.toFixed(2),
            totalCost: totalCost.toFixed(2),
            unitCost: unitCost.toFixed(4),
            sellingPrice: sellingPrice.toFixed(2),
            grossMargin: grossMargin.toFixed(2),
            grossMarginPercent: grossMarginPercent.toFixed(2),
            status: "rascunho",
            observations: input.observations || null,
            createdBy: ctx.user?.id,
            updatedBy: ctx.user?.id,
          }).$returningId();
          
          recordId = result.id;
          
          // 10. Verificar variação de custo e criar alerta se necessário
          const previousRecords = await db.select().from(schema.costRecords)
            .where(and(
              eq(schema.costRecords.skuId, input.skuId),
              eq(schema.costRecords.status, "confirmado")
            ))
            .orderBy(desc(schema.costRecords.createdAt))
            .limit(1);
          
          if (previousRecords.length > 0) {
            const previousUnitCost = parseFloat(previousRecords[0].unitCost || "0");
            if (previousUnitCost > 0) {
              const variationPercent = ((unitCost - previousUnitCost) / previousUnitCost) * 100;
              
              // Buscar threshold de alerta nas configurações (padrão 10%)
              const [alertSetting] = await db.select().from(schema.costSettings)
                .where(eq(schema.costSettings.settingKey, "alert_threshold_percent"));
              const threshold = parseFloat(alertSetting?.settingValue || "10");
              
              if (Math.abs(variationPercent) >= threshold) {
                await db.insert(schema.costAlerts).values({
                  skuId: input.skuId,
                  period: input.period,
                  previousPeriod: previousRecords[0].period,
                  previousUnitCost: previousUnitCost.toFixed(4),
                  currentUnitCost: unitCost.toFixed(4),
                  variationPercent: variationPercent.toFixed(2),
                  thresholdPercent: threshold.toFixed(2),
                  alertType: variationPercent > 0 ? "aumento" : "reducao",
                  status: "novo",
                });
              }
            }
          }
        }
        
        return {
          success: true,
          id: recordId,
          skuCode: sku.code,
          skuDescription: sku.description,
          period: input.period,
          quantityProduced: input.quantityProduced,
          directCostTotal,
          directCostDetails,
          laborCostTotal,
          laborCostDetails,
          indirectCostTotal,
          indirectCostDetails,
          freightCost,
          taxCost,
          wastagePercent,
          wastageValue,
          totalCost,
          unitCost,
          sellingPrice,
          grossMargin,
          grossMarginPercent,
        };
      }),

    // Obter histórico de custos de um SKU
    getHistory: protectedProcedure
      .input(z.object({
        skuId: z.number(),
        months: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const months = input.months || 6;
        
        return db.select().from(schema.costRecords)
          .where(eq(schema.costRecords.skuId, input.skuId))
          .orderBy(desc(schema.costRecords.period))
          .limit(months);
      }),

    // Atualizar status de um registro
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(periodStatuses),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(schema.costRecords)
          .set({
            status: input.status,
            updatedBy: ctx.user?.id,
          })
          .where(eq(schema.costRecords.id, input.id));
        
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Verificar se o registro está fechado
        const [record] = await db.select().from(schema.costRecords)
          .where(eq(schema.costRecords.id, input.id));
        
        if (record?.status === "fechado") {
          throw new Error("Não é possível excluir um registro de custo fechado");
        }
        
        await db.delete(schema.costRecords)
          .where(eq(schema.costRecords.id, input.id));
        
        return { success: true };
      }),
  }),

  // ============================================================================
  // COST ALERTS
  // ============================================================================
  alerts: router({
    list: protectedProcedure
      .input(z.object({
        status: z.enum(["novo", "visualizado", "resolvido", "ignorado"]).optional(),
        skuId: z.number().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const conditions = [];
        if (input?.status) {
          conditions.push(eq(schema.costAlerts.status, input.status));
        }
        if (input?.skuId) {
          conditions.push(eq(schema.costAlerts.skuId, input.skuId));
        }
        
        let query = db.select().from(schema.costAlerts);
        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as any;
        }
        
        return query.orderBy(desc(schema.costAlerts.createdAt)).limit(input?.limit || 50);
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["novo", "visualizado", "resolvido", "ignorado"]),
        resolution: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const updateData: Record<string, any> = { status: input.status };
        
        if (input.status === "resolvido" || input.status === "ignorado") {
          updateData.resolvedAt = new Date();
          updateData.resolvedBy = ctx.user?.id;
          if (input.resolution) {
            updateData.resolution = input.resolution;
          }
        }
        
        await db.update(schema.costAlerts)
          .set(updateData)
          .where(eq(schema.costAlerts.id, input.id));
        
        return { success: true };
      }),

    getUnreadCount: protectedProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) return 0;
        
        const alerts = await db.select().from(schema.costAlerts)
          .where(eq(schema.costAlerts.status, "novo"));
        
        return alerts.length;
      }),
  }),

  // ============================================================================
  // PERIOD CLOSURES
  // ============================================================================
  periods: router({
    list: protectedProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) return [];
        
        return db.select().from(schema.costPeriodClosures)
          .orderBy(desc(schema.costPeriodClosures.period));
      }),

    getByPeriod: protectedProcedure
      .input(z.object({ period: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        
        const [result] = await db.select().from(schema.costPeriodClosures)
          .where(eq(schema.costPeriodClosures.period, input.period));
        return result || null;
      }),

    close: protectedProcedure
      .input(z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Verificar se já existe fechamento para este período
        const [existing] = await db.select().from(schema.costPeriodClosures)
          .where(eq(schema.costPeriodClosures.period, input.period));
        
        if (existing) {
          throw new Error("Este período já foi fechado");
        }
        
        // Buscar todos os registros de custo do período
        const costRecords = await db.select().from(schema.costRecords)
          .where(eq(schema.costRecords.period, input.period));
        
        // Calcular totais
        let totalProduction = 0;
        let totalDirectCost = 0;
        let totalIndirectCost = 0;
        let totalLaborCost = 0;
        let totalVariableCost = 0;
        let totalCost = 0;
        
        for (const record of costRecords) {
          totalProduction += parseFloat(record.quantityProduced || "0");
          totalDirectCost += parseFloat(record.directCostTotal || "0");
          totalIndirectCost += parseFloat(record.indirectCostTotal || "0");
          totalLaborCost += parseFloat(record.laborCostTotal || "0");
          totalVariableCost += parseFloat(record.freightCost || "0") + parseFloat(record.taxCost || "0");
          totalCost += parseFloat(record.totalCost || "0");
        }
        
        const averageUnitCost = totalProduction > 0 ? totalCost / totalProduction : 0;
        
        // Criar fechamento
        const [result] = await db.insert(schema.costPeriodClosures).values({
          period: input.period,
          totalProduction: totalProduction.toFixed(2),
          totalDirectCost: totalDirectCost.toFixed(2),
          totalIndirectCost: totalIndirectCost.toFixed(2),
          totalLaborCost: totalLaborCost.toFixed(2),
          totalVariableCost: totalVariableCost.toFixed(2),
          totalCost: totalCost.toFixed(2),
          averageUnitCost: averageUnitCost.toFixed(4),
          reportData: JSON.stringify({ costRecords: costRecords.map(r => r.id) }),
          closedAt: new Date(),
          closedBy: ctx.user?.id || 0,
          closedByName: ctx.user?.name || null,
          observations: input.observations || null,
        }).$returningId();
        
        // Marcar todos os registros de custo do período como fechados
        await db.update(schema.costRecords)
          .set({ status: "fechado", updatedBy: ctx.user?.id })
          .where(eq(schema.costRecords.period, input.period));
        
        return { success: true, id: result.id };
      }),
  }),

  // ============================================================================
  // COST SETTINGS
  // ============================================================================
  settings: router({
    list: protectedProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) return [];
        
        return db.select().from(schema.costSettings);
      }),

    get: protectedProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        
        const [result] = await db.select().from(schema.costSettings)
          .where(eq(schema.costSettings.settingKey, input.key));
        return result || null;
      }),

    set: protectedProcedure
      .input(z.object({
        key: z.string().min(1).max(100),
        value: z.string(),
        type: z.enum(["number", "percent", "boolean", "json"]),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [existing] = await db.select().from(schema.costSettings)
          .where(eq(schema.costSettings.settingKey, input.key));
        
        if (existing) {
          await db.update(schema.costSettings)
            .set({
              settingValue: input.value,
              settingType: input.type,
              description: input.description || existing.description,
              updatedBy: ctx.user?.id,
            })
            .where(eq(schema.costSettings.id, existing.id));
          
          return { success: true, id: existing.id };
        } else {
          const [result] = await db.insert(schema.costSettings).values({
            settingKey: input.key,
            settingValue: input.value,
            settingType: input.type,
            description: input.description || null,
            updatedBy: ctx.user?.id,
          }).$returningId();
          
          return { success: true, id: result.id };
        }
      }),
  }),

  // ============================================================================
  // DASHBOARD & ANALYTICS
  // ============================================================================
  dashboard: router({
    // Obter resumo geral de custos
    getSummary: protectedProcedure
      .input(z.object({
        period: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        
        const currentPeriod = input?.period || new Date().toISOString().slice(0, 7);
        
        // Buscar registros de custo do período
        const costRecords = await db.select().from(schema.costRecords)
          .where(eq(schema.costRecords.period, currentPeriod));
        
        // Buscar custos indiretos do período
        const indirectCosts = await db.select().from(schema.monthlyIndirectCosts)
          .where(eq(schema.monthlyIndirectCosts.period, currentPeriod));
        
        // Calcular totais
        let totalDirect = 0;
        let totalLabor = 0;
        let totalIndirect = 0;
        let totalFreight = 0;
        let totalTax = 0;
        let totalWastage = 0;
        let totalProduction = 0;
        
        for (const record of costRecords) {
          totalDirect += parseFloat(record.directCostTotal || "0");
          totalLabor += parseFloat(record.laborCostTotal || "0");
          totalIndirect += parseFloat(record.indirectCostTotal || "0");
          totalFreight += parseFloat(record.freightCost || "0");
          totalTax += parseFloat(record.taxCost || "0");
          totalWastage += parseFloat(record.wastageValue || "0");
          totalProduction += parseFloat(record.quantityProduced || "0");
        }
        
        let totalMonthlyIndirect = 0;
        for (const cost of indirectCosts) {
          totalMonthlyIndirect += parseFloat(cost.value || "0");
        }
        
        const totalCosts = totalDirect + totalLabor + totalIndirect + totalFreight + totalTax + totalWastage;
        const avgUnitCost = costRecords.length > 0 
          ? costRecords.reduce((sum, r) => sum + parseFloat(r.unitCost || "0"), 0) / costRecords.length
          : 0;
        
        return {
          period: currentPeriod,
          totalDirect,
          totalLabor,
          totalIndirect,
          totalFreight,
          totalTax,
          totalWastage,
          totalCosts,
          totalMonthlyIndirect,
          totalProduction,
          avgUnitCost,
          recordCount: costRecords.length,
        };
      }),

    // Obter custos por SKU
    getCostsBySku: protectedProcedure
      .input(z.object({
        period: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const currentPeriod = input?.period || new Date().toISOString().slice(0, 7);
        
        const costRecords = await db.select().from(schema.costRecords)
          .where(eq(schema.costRecords.period, currentPeriod));
        
        // Buscar informações dos SKUs
        const skuIds = Array.from(new Set(costRecords.map(r => r.skuId)));
        if (skuIds.length === 0) return [];
        
        const skus = await db.select().from(schema.skus)
          .where(inArray(schema.skus.id, skuIds));
        
        const skuMap = new Map(skus.map(s => [s.id, s]));
        
        return costRecords.map(record => {
          const sku = skuMap.get(record.skuId);
          
          return {
            recordId: record.id,
            skuId: record.skuId,
            skuCode: sku?.code || "N/A",
            skuDescription: sku?.description || "N/A",
            unitCost: parseFloat(record.unitCost || "0"),
            sellingPrice: parseFloat(record.sellingPrice || "0"),
            grossMargin: parseFloat(record.grossMargin || "0"),
            grossMarginPercent: parseFloat(record.grossMarginPercent || "0"),
            quantityProduced: parseFloat(record.quantityProduced || "0"),
            totalCost: parseFloat(record.totalCost || "0"),
            status: record.status,
          };
        });
      }),

    // Obter comparação mensal
    getMonthlyComparison: protectedProcedure
      .input(z.object({
        months: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const months = input?.months || 6;
        
        // Gerar lista de períodos
        const periodList: string[] = [];
        const now = new Date();
        for (let i = 0; i < months; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          periodList.push(date.toISOString().slice(0, 7));
        }
        
        const results = [];
        
        for (const period of periodList) {
          const costRecords = await db.select().from(schema.costRecords)
            .where(eq(schema.costRecords.period, period));
          
          const indirectCosts = await db.select().from(schema.monthlyIndirectCosts)
            .where(eq(schema.monthlyIndirectCosts.period, period));
          
          let totalDirect = 0;
          let totalLabor = 0;
          let totalIndirect = 0;
          let totalProduction = 0;
          
          for (const record of costRecords) {
            totalDirect += parseFloat(record.directCostTotal || "0");
            totalLabor += parseFloat(record.laborCostTotal || "0");
            totalIndirect += parseFloat(record.indirectCostTotal || "0");
            totalProduction += parseFloat(record.quantityProduced || "0");
          }
          
          let monthlyIndirect = 0;
          for (const cost of indirectCosts) {
            monthlyIndirect += parseFloat(cost.value || "0");
          }
          
          results.push({
            period,
            totalDirect,
            totalLabor,
            totalIndirect,
            monthlyIndirect,
            totalProduction,
            avgUnitCost: costRecords.length > 0
              ? costRecords.reduce((sum, r) => sum + parseFloat(r.unitCost || "0"), 0) / costRecords.length
              : 0,
            recordCount: costRecords.length,
          });
        }
        
        return results.reverse(); // Ordenar do mais antigo para o mais recente
      }),
  }),

  // ============================================================================
  // LEGACY ROUTES (mantidos para compatibilidade)
  // ============================================================================
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
