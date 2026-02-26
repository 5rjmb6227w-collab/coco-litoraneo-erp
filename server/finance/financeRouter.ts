import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { eq, and, asc, desc, sql, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  chartOfAccounts,
  InsertChartOfAccount,
  bankAccounts,
  InsertBankAccount,
  bankTransactions,
  InsertBankTransaction,
} from "../../drizzle/schema";

// ============================================================================
// FINANCE ROUTER — Plano de Contas + Contas Bancárias + Movimentações
// Padrão: Router separado por módulo com campos de auditoria
// ============================================================================

let _db: ReturnType<typeof drizzle> | null = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db!;
}

export const financeModuleRouter = router({
  // ============================================================================
  // PLANO DE CONTAS
  // ============================================================================
  chartOfAccounts: router({
    list: protectedProcedure
      .input(z.object({
        nature: z.enum(["ativo", "passivo", "receita", "despesa", "patrimonio_liquido"]).optional(),
        type: z.enum(["sintetica", "analitica"]).optional(),
        isActive: z.boolean().optional(),
        parentId: z.number().nullable().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        const conditions = [];
        if (input?.nature) conditions.push(eq(chartOfAccounts.nature, input.nature));
        if (input?.type) conditions.push(eq(chartOfAccounts.type, input.type));
        if (input?.isActive !== undefined) conditions.push(eq(chartOfAccounts.isActive, input.isActive));
        if (input?.parentId === null) conditions.push(isNull(chartOfAccounts.parentId));
        else if (input?.parentId) conditions.push(eq(chartOfAccounts.parentId, input.parentId));

        const result = await db.select().from(chartOfAccounts)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(asc(chartOfAccounts.code));
        return result;
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        const [account] = await db.select().from(chartOfAccounts)
          .where(eq(chartOfAccounts.id, input.id));
        return account || null;
      }),

    getTree: protectedProcedure
      .input(z.object({ isActive: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        const conditions = [];
        if (input?.isActive !== undefined) conditions.push(eq(chartOfAccounts.isActive, input.isActive));

        const allAccounts = await db.select().from(chartOfAccounts)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(asc(chartOfAccounts.code));

        // Montar árvore hierárquica
        type AccountNode = typeof allAccounts[0] & { children: AccountNode[] };
        const map = new Map<number, AccountNode>();
        const roots: AccountNode[] = [];

        for (const acc of allAccounts) {
          map.set(acc.id, { ...acc, children: [] });
        }

        for (const acc of allAccounts) {
          const node = map.get(acc.id)!;
          if (acc.parentId && map.has(acc.parentId)) {
            map.get(acc.parentId)!.children.push(node);
          } else {
            roots.push(node);
          }
        }

        return roots;
      }),

    create: protectedProcedure
      .input(z.object({
        code: z.string().min(1).max(20),
        name: z.string().min(1).max(200),
        nature: z.enum(["ativo", "passivo", "receita", "despesa", "patrimonio_liquido"]),
        type: z.enum(["sintetica", "analitica"]),
        level: z.number().min(1).max(5),
        parentId: z.number().nullable().optional(),
        description: z.string().optional(),
        acceptsEntries: z.boolean().optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const data: InsertChartOfAccount = {
          ...input,
          parentId: input.parentId ?? undefined,
          acceptsEntries: input.type === "analitica" ? (input.acceptsEntries ?? true) : false,
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        };
        const [result] = await db.insert(chartOfAccounts).values(data);
        return { id: result.insertId, ...data };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().min(1).max(20).optional(),
        name: z.string().min(1).max(200).optional(),
        nature: z.enum(["ativo", "passivo", "receita", "despesa", "patrimonio_liquido"]).optional(),
        type: z.enum(["sintetica", "analitica"]).optional(),
        level: z.number().min(1).max(5).optional(),
        parentId: z.number().nullable().optional(),
        description: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        acceptsEntries: z.boolean().optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const { id, ...updates } = input;
        await db.update(chartOfAccounts)
          .set({ ...updates, parentId: updates.parentId ?? undefined, updatedBy: ctx.user?.id })
          .where(eq(chartOfAccounts.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        // Verificar se tem filhos
        const children = await db.select().from(chartOfAccounts)
          .where(eq(chartOfAccounts.parentId, input.id));
        if (children.length > 0) {
          throw new Error("Não é possível excluir conta com subcontas. Exclua as subcontas primeiro.");
        }
        // Verificar se tem movimentações
        const txns = await db.select().from(bankTransactions)
          .where(eq(bankTransactions.chartOfAccountId, input.id))
          .limit(1);
        if (txns.length > 0) {
          throw new Error("Não é possível excluir conta com movimentações vinculadas.");
        }
        await db.delete(chartOfAccounts).where(eq(chartOfAccounts.id, input.id));
        return { success: true };
      }),

    seedDefault: protectedProcedure
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        // Verificar se já tem contas
        const existing = await db.select().from(chartOfAccounts).limit(1);
        if (existing.length > 0) {
          throw new Error("Plano de contas já possui registros. Limpe antes de recarregar.");
        }

        const defaultAccounts: InsertChartOfAccount[] = [
          // NÍVEL 1 — GRUPOS PRINCIPAIS
          { code: "1", name: "ATIVO", nature: "ativo", type: "sintetica", level: 1, acceptsEntries: false, displayOrder: 1, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "2", name: "PASSIVO", nature: "passivo", type: "sintetica", level: 1, acceptsEntries: false, displayOrder: 2, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "3", name: "RECEITAS", nature: "receita", type: "sintetica", level: 1, acceptsEntries: false, displayOrder: 3, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "4", name: "DESPESAS", nature: "despesa", type: "sintetica", level: 1, acceptsEntries: false, displayOrder: 4, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "5", name: "PATRIMÔNIO LÍQUIDO", nature: "patrimonio_liquido", type: "sintetica", level: 1, acceptsEntries: false, displayOrder: 5, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
        ];

        // Inserir nível 1
        for (const acc of defaultAccounts) {
          await db.insert(chartOfAccounts).values(acc);
        }

        // Buscar IDs dos pais
        const parents = await db.select().from(chartOfAccounts).orderBy(asc(chartOfAccounts.code));
        const parentMap = new Map(parents.map(p => [p.code, p.id]));

        // NÍVEL 2 — SUBGRUPOS
        const level2: InsertChartOfAccount[] = [
          // ATIVO
          { code: "1.1", name: "Ativo Circulante", nature: "ativo", type: "sintetica", level: 2, parentId: parentMap.get("1"), acceptsEntries: false, displayOrder: 1, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "1.2", name: "Ativo Não Circulante", nature: "ativo", type: "sintetica", level: 2, parentId: parentMap.get("1"), acceptsEntries: false, displayOrder: 2, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          // PASSIVO
          { code: "2.1", name: "Passivo Circulante", nature: "passivo", type: "sintetica", level: 2, parentId: parentMap.get("2"), acceptsEntries: false, displayOrder: 1, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "2.2", name: "Passivo Não Circulante", nature: "passivo", type: "sintetica", level: 2, parentId: parentMap.get("2"), acceptsEntries: false, displayOrder: 2, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          // RECEITAS
          { code: "3.1", name: "Receita Operacional", nature: "receita", type: "sintetica", level: 2, parentId: parentMap.get("3"), acceptsEntries: false, displayOrder: 1, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "3.2", name: "Receita Não Operacional", nature: "receita", type: "sintetica", level: 2, parentId: parentMap.get("3"), acceptsEntries: false, displayOrder: 2, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          // DESPESAS
          { code: "4.1", name: "Custos de Produção", nature: "despesa", type: "sintetica", level: 2, parentId: parentMap.get("4"), acceptsEntries: false, displayOrder: 1, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "4.2", name: "Despesas Operacionais", nature: "despesa", type: "sintetica", level: 2, parentId: parentMap.get("4"), acceptsEntries: false, displayOrder: 2, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "4.3", name: "Despesas Administrativas", nature: "despesa", type: "sintetica", level: 2, parentId: parentMap.get("4"), acceptsEntries: false, displayOrder: 3, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "4.4", name: "Despesas Financeiras", nature: "despesa", type: "sintetica", level: 2, parentId: parentMap.get("4"), acceptsEntries: false, displayOrder: 4, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
        ];

        for (const acc of level2) {
          await db.insert(chartOfAccounts).values(acc);
        }

        // Buscar IDs atualizados
        const allParents = await db.select().from(chartOfAccounts).orderBy(asc(chartOfAccounts.code));
        const allMap = new Map(allParents.map(p => [p.code, p.id]));

        // NÍVEL 3 — CONTAS ANALÍTICAS
        const level3: InsertChartOfAccount[] = [
          // Ativo Circulante
          { code: "1.1.01", name: "Caixa", nature: "ativo", type: "analitica", level: 3, parentId: allMap.get("1.1"), acceptsEntries: true, displayOrder: 1, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "1.1.02", name: "Bancos Conta Movimento", nature: "ativo", type: "analitica", level: 3, parentId: allMap.get("1.1"), acceptsEntries: true, displayOrder: 2, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "1.1.03", name: "Aplicações Financeiras", nature: "ativo", type: "analitica", level: 3, parentId: allMap.get("1.1"), acceptsEntries: true, displayOrder: 3, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "1.1.04", name: "Contas a Receber", nature: "ativo", type: "analitica", level: 3, parentId: allMap.get("1.1"), acceptsEntries: true, displayOrder: 4, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "1.1.05", name: "Estoques", nature: "ativo", type: "analitica", level: 3, parentId: allMap.get("1.1"), acceptsEntries: true, displayOrder: 5, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "1.1.06", name: "Adiantamentos a Fornecedores", nature: "ativo", type: "analitica", level: 3, parentId: allMap.get("1.1"), acceptsEntries: true, displayOrder: 6, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          // Ativo Não Circulante
          { code: "1.2.01", name: "Imobilizado", nature: "ativo", type: "analitica", level: 3, parentId: allMap.get("1.2"), acceptsEntries: true, displayOrder: 1, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "1.2.02", name: "Depreciação Acumulada", nature: "ativo", type: "analitica", level: 3, parentId: allMap.get("1.2"), acceptsEntries: true, displayOrder: 2, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          // Passivo Circulante
          { code: "2.1.01", name: "Fornecedores", nature: "passivo", type: "analitica", level: 3, parentId: allMap.get("2.1"), acceptsEntries: true, displayOrder: 1, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "2.1.02", name: "Salários a Pagar", nature: "passivo", type: "analitica", level: 3, parentId: allMap.get("2.1"), acceptsEntries: true, displayOrder: 2, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "2.1.03", name: "Impostos a Recolher", nature: "passivo", type: "analitica", level: 3, parentId: allMap.get("2.1"), acceptsEntries: true, displayOrder: 3, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "2.1.04", name: "Produtores a Pagar", nature: "passivo", type: "analitica", level: 3, parentId: allMap.get("2.1"), acceptsEntries: true, displayOrder: 4, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          // Receita Operacional
          { code: "3.1.01", name: "Venda de Produtos", nature: "receita", type: "analitica", level: 3, parentId: allMap.get("3.1"), acceptsEntries: true, displayOrder: 1, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "3.1.02", name: "Venda de Subprodutos", nature: "receita", type: "analitica", level: 3, parentId: allMap.get("3.1"), acceptsEntries: true, displayOrder: 2, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          // Receita Não Operacional
          { code: "3.2.01", name: "Rendimentos Financeiros", nature: "receita", type: "analitica", level: 3, parentId: allMap.get("3.2"), acceptsEntries: true, displayOrder: 1, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          // Custos de Produção
          { code: "4.1.01", name: "Matéria-Prima (Coco)", nature: "despesa", type: "analitica", level: 3, parentId: allMap.get("4.1"), acceptsEntries: true, displayOrder: 1, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "4.1.02", name: "Mão de Obra Direta", nature: "despesa", type: "analitica", level: 3, parentId: allMap.get("4.1"), acceptsEntries: true, displayOrder: 2, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "4.1.03", name: "Custos Indiretos de Fabricação", nature: "despesa", type: "analitica", level: 3, parentId: allMap.get("4.1"), acceptsEntries: true, displayOrder: 3, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "4.1.04", name: "Embalagens", nature: "despesa", type: "analitica", level: 3, parentId: allMap.get("4.1"), acceptsEntries: true, displayOrder: 4, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          // Despesas Operacionais
          { code: "4.2.01", name: "Frete e Logística", nature: "despesa", type: "analitica", level: 3, parentId: allMap.get("4.2"), acceptsEntries: true, displayOrder: 1, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "4.2.02", name: "Manutenção de Equipamentos", nature: "despesa", type: "analitica", level: 3, parentId: allMap.get("4.2"), acceptsEntries: true, displayOrder: 2, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          // Despesas Administrativas
          { code: "4.3.01", name: "Salários e Encargos", nature: "despesa", type: "analitica", level: 3, parentId: allMap.get("4.3"), acceptsEntries: true, displayOrder: 1, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "4.3.02", name: "Aluguel", nature: "despesa", type: "analitica", level: 3, parentId: allMap.get("4.3"), acceptsEntries: true, displayOrder: 2, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "4.3.03", name: "Energia Elétrica", nature: "despesa", type: "analitica", level: 3, parentId: allMap.get("4.3"), acceptsEntries: true, displayOrder: 3, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "4.3.04", name: "Água", nature: "despesa", type: "analitica", level: 3, parentId: allMap.get("4.3"), acceptsEntries: true, displayOrder: 4, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "4.3.05", name: "Material de Limpeza e CIP", nature: "despesa", type: "analitica", level: 3, parentId: allMap.get("4.3"), acceptsEntries: true, displayOrder: 5, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          // Despesas Financeiras
          { code: "4.4.01", name: "Juros e Multas", nature: "despesa", type: "analitica", level: 3, parentId: allMap.get("4.4"), acceptsEntries: true, displayOrder: 1, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
          { code: "4.4.02", name: "Tarifas Bancárias", nature: "despesa", type: "analitica", level: 3, parentId: allMap.get("4.4"), acceptsEntries: true, displayOrder: 2, createdBy: ctx.user?.id, updatedBy: ctx.user?.id },
        ];

        for (const acc of level3) {
          await db.insert(chartOfAccounts).values(acc);
        }

        const total = await db.select({ count: sql<number>`COUNT(*)` }).from(chartOfAccounts);
        return { success: true, totalAccounts: total[0]?.count || 0 };
      }),
  }),

  // ============================================================================
  // CONTAS BANCÁRIAS
  // ============================================================================
  bankAccounts: router({
    list: protectedProcedure
      .input(z.object({
        isActive: z.boolean().optional(),
        accountType: z.enum(["corrente", "poupanca", "investimento", "caixa"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        const conditions = [];
        if (input?.isActive !== undefined) conditions.push(eq(bankAccounts.isActive, input.isActive));
        if (input?.accountType) conditions.push(eq(bankAccounts.accountType, input.accountType));

        return db.select().from(bankAccounts)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(asc(bankAccounts.bankName));
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        const [account] = await db.select().from(bankAccounts)
          .where(eq(bankAccounts.id, input.id));
        return account || null;
      }),

    create: protectedProcedure
      .input(z.object({
        bankName: z.string().min(1).max(100),
        bankCode: z.string().max(10).optional(),
        agency: z.string().max(20).optional(),
        accountNumber: z.string().min(1).max(30),
        accountType: z.enum(["corrente", "poupanca", "investimento", "caixa"]),
        accountHolder: z.string().max(200).optional(),
        cnpjCpf: z.string().max(20).optional(),
        pixKey: z.string().max(100).optional(),
        initialBalance: z.string().optional(),
        chartOfAccountId: z.number().optional(),
        color: z.string().max(7).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const data: InsertBankAccount = {
          ...input,
          initialBalance: input.initialBalance || "0",
          currentBalance: input.initialBalance || "0",
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        };
        const [result] = await db.insert(bankAccounts).values(data);
        return { id: result.insertId, ...data };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        bankName: z.string().min(1).max(100).optional(),
        bankCode: z.string().max(10).optional(),
        agency: z.string().max(20).optional(),
        accountNumber: z.string().min(1).max(30).optional(),
        accountType: z.enum(["corrente", "poupanca", "investimento", "caixa"]).optional(),
        accountHolder: z.string().max(200).optional(),
        cnpjCpf: z.string().max(20).optional(),
        pixKey: z.string().max(100).optional(),
        chartOfAccountId: z.number().nullable().optional(),
        color: z.string().max(7).nullable().optional(),
        notes: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const { id, ...updates } = input;
        await db.update(bankAccounts)
          .set({ ...updates, chartOfAccountId: updates.chartOfAccountId ?? undefined, updatedBy: ctx.user?.id })
          .where(eq(bankAccounts.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        const txns = await db.select().from(bankTransactions)
          .where(eq(bankTransactions.bankAccountId, input.id))
          .limit(1);
        if (txns.length > 0) {
          throw new Error("Não é possível excluir conta com movimentações. Desative-a.");
        }
        await db.delete(bankAccounts).where(eq(bankAccounts.id, input.id));
        return { success: true };
      }),

    getSummary: protectedProcedure
      .query(async () => {
        const db = await getDb();
        const accounts = await db.select().from(bankAccounts)
          .where(eq(bankAccounts.isActive, true));

        const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.currentBalance), 0);
        return {
          totalAccounts: accounts.length,
          totalBalance,
          accounts: accounts.map(a => ({
            id: a.id,
            bankName: a.bankName,
            accountType: a.accountType,
            currentBalance: Number(a.currentBalance),
            color: a.color,
          })),
        };
      }),
  }),

  // ============================================================================
  // MOVIMENTAÇÕES BANCÁRIAS
  // ============================================================================
  bankTransactions: router({
    list: protectedProcedure
      .input(z.object({
        bankAccountId: z.number().optional(),
        type: z.enum(["credito", "debito", "transferencia"]).optional(),
        category: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        reconciled: z.boolean().optional(),
        limit: z.number().min(1).max(500).optional(),
        offset: z.number().min(0).optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        const conditions = [];
        if (input?.bankAccountId) conditions.push(eq(bankTransactions.bankAccountId, input.bankAccountId));
        if (input?.type) conditions.push(eq(bankTransactions.type, input.type));
        if (input?.reconciled !== undefined) conditions.push(eq(bankTransactions.reconciled, input.reconciled));

        const limit = input?.limit || 100;
        const offset = input?.offset || 0;

        const result = await db.select().from(bankTransactions)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(bankTransactions.transactionDate), desc(bankTransactions.id))
          .limit(limit)
          .offset(offset);

        return result;
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        const [txn] = await db.select().from(bankTransactions)
          .where(eq(bankTransactions.id, input.id));
        return txn || null;
      }),

    create: protectedProcedure
      .input(z.object({
        bankAccountId: z.number(),
        type: z.enum(["credito", "debito", "transferencia"]),
        category: z.enum([
          "receita_vendas", "receita_outros", "pagamento_produtor", "pagamento_fornecedor",
          "pagamento_funcionario", "pagamento_imposto", "pagamento_servico", "tarifa_bancaria",
          "transferencia_entre_contas", "rendimento", "emprestimo", "investimento", "outros"
        ]),
        description: z.string().min(1).max(300),
        amount: z.string(),
        transactionDate: z.string(),
        competenceDate: z.string().optional(),
        documentNumber: z.string().max(50).optional(),
        chartOfAccountId: z.number().optional(),
        relatedEntityType: z.string().optional(),
        relatedEntityId: z.number().optional(),
        transferToAccountId: z.number().optional(),
        attachmentUrl: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const amount = Number(input.amount);

        // Buscar conta bancária
        const [account] = await db.select().from(bankAccounts)
          .where(eq(bankAccounts.id, input.bankAccountId));
        if (!account) throw new Error("Conta bancária não encontrada");

        // Calcular novo saldo
        let newBalance = Number(account.currentBalance);
        if (input.type === "credito") {
          newBalance += amount;
        } else if (input.type === "debito") {
          newBalance -= amount;
        } else if (input.type === "transferencia") {
          newBalance -= amount;
        }

        // Inserir transação
        const data: InsertBankTransaction = {
          ...input,
          transactionDate: new Date(input.transactionDate),
          competenceDate: input.competenceDate ? new Date(input.competenceDate) : undefined,
          balanceAfter: String(newBalance),
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        };
        const [result] = await db.insert(bankTransactions).values(data);

        // Atualizar saldo da conta
        await db.update(bankAccounts)
          .set({ currentBalance: String(newBalance), updatedBy: ctx.user?.id })
          .where(eq(bankAccounts.id, input.bankAccountId));

        // Se for transferência, creditar na conta destino
        if (input.type === "transferencia" && input.transferToAccountId) {
          const [destAccount] = await db.select().from(bankAccounts)
            .where(eq(bankAccounts.id, input.transferToAccountId));
          if (destAccount) {
            const destNewBalance = Number(destAccount.currentBalance) + amount;
            const destTxnData: InsertBankTransaction = {
              bankAccountId: input.transferToAccountId,
              type: "credito",
              category: "transferencia_entre_contas",
              description: `Transferência recebida de ${account.bankName}`,
              amount: input.amount,
              balanceAfter: String(destNewBalance),
              transactionDate: new Date(input.transactionDate),
              competenceDate: input.competenceDate ? new Date(input.competenceDate) : undefined,
              documentNumber: input.documentNumber,
              relatedEntityType: "bank_transaction",
              relatedEntityId: result.insertId,
              createdBy: ctx.user?.id,
              updatedBy: ctx.user?.id,
            };
            await db.insert(bankTransactions).values(destTxnData);
            await db.update(bankAccounts)
              .set({ currentBalance: String(destNewBalance), updatedBy: ctx.user?.id })
              .where(eq(bankAccounts.id, input.transferToAccountId));
          }
        }

        return { id: result.insertId, balanceAfter: newBalance };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const [txn] = await db.select().from(bankTransactions)
          .where(eq(bankTransactions.id, input.id));
        if (!txn) throw new Error("Movimentação não encontrada");
        if (txn.reconciled) throw new Error("Não é possível excluir movimentação conciliada");

        // Reverter saldo
        const [account] = await db.select().from(bankAccounts)
          .where(eq(bankAccounts.id, txn.bankAccountId));
        if (account) {
          let newBalance = Number(account.currentBalance);
          if (txn.type === "credito") newBalance -= Number(txn.amount);
          else if (txn.type === "debito") newBalance += Number(txn.amount);
          else if (txn.type === "transferencia") newBalance += Number(txn.amount);

          await db.update(bankAccounts)
            .set({ currentBalance: String(newBalance), updatedBy: ctx.user?.id })
            .where(eq(bankAccounts.id, txn.bankAccountId));
        }

        await db.delete(bankTransactions).where(eq(bankTransactions.id, input.id));
        return { success: true };
      }),

    reconcile: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        for (const id of input.ids) {
          await db.update(bankTransactions)
            .set({
              reconciled: true,
              reconciledAt: sql`NOW()`,
              reconciledBy: ctx.user?.id,
            })
            .where(eq(bankTransactions.id, id));
        }
        return { success: true, count: input.ids.length };
      }),
  }),
});
