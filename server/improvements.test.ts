import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-improvements",
    email: "test@cocolitoraneo.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

// ============================================================================
// PLANO DE CONTAS (Chart of Accounts)
// ============================================================================
describe("finance.chartOfAccounts", () => {
  it("should list chart of accounts", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finance.chartOfAccounts.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a chart of account entry", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const ts = Date.now();
    const result = await caller.finance.chartOfAccounts.create({
      code: `T${ts}`,
      name: `Ativo Test ${ts}`,
      type: "sintetica",
      nature: "ativo",
      level: 1,
    });
    expect(result.id).toBeDefined();
  });

  it("should create a child account under parent", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const ts = Date.now();
    // Create parent first
    const parent = await caller.finance.chartOfAccounts.create({
      code: `P${ts}`,
      name: `Ativo Circulante ${ts}`,
      type: "sintetica",
      nature: "ativo",
      level: 2,
    });

    // Create child
    const child = await caller.finance.chartOfAccounts.create({
      code: `C${ts}`,
      name: `Caixa ${ts}`,
      type: "sintetica",
      nature: "ativo",
      level: 3,
      parentId: parent.id,
    });

    expect(child.id).toBeDefined();
  });

  it("should update a chart of account entry", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const ts = Date.now();
    const created = await caller.finance.chartOfAccounts.create({
      code: `U${ts}`,
      name: `Conta Teste ${ts}`,
      type: "analitica",
      nature: "ativo",
      level: 1,
    });

    const result = await caller.finance.chartOfAccounts.update({
      id: created.id!,
      name: "Conta Teste Atualizada",
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// CONTAS BANCÁRIAS (Bank Accounts)
// ============================================================================
describe("finance.bankAccounts", () => {
  it("should list bank accounts", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finance.bankAccounts.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a bank account", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finance.bankAccounts.create({
      bankName: "Banco do Brasil",
      bankCode: "001",
      agency: "1234",
      accountNumber: "56789-0",
      accountType: "corrente",
      initialBalance: "10000.00",
    });
    expect(result.id).toBeDefined();
  });

  it("should update a bank account", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.finance.bankAccounts.create({
      bankName: "Itaú",
      bankCode: "341",
      agency: "5678",
      accountNumber: "12345-6",
      accountType: "corrente",
      initialBalance: "5000.00",
    });

    const result = await caller.finance.bankAccounts.update({
      id: created.id!,
      bankName: "Itaú Unibanco",
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// TRANSAÇÕES BANCÁRIAS (Bank Transactions)
// ============================================================================
describe("finance.bankTransactions", () => {
  it("should list bank transactions", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finance.bankTransactions.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a bank transaction (credit)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a bank account first
    const account = await caller.finance.bankAccounts.create({
      bankName: "Caixa Econômica",
      bankCode: "104",
      agency: "9999",
      accountNumber: "88888-7",
      accountType: "corrente",
      initialBalance: "0",
    });

    const result = await caller.finance.bankTransactions.create({
      bankAccountId: account.id!,
      type: "credito",
      category: "receita_vendas",
      description: "Venda de coco ralado - Lote 001",
      amount: "5000.00",
      transactionDate: "2026-02-26",
    });
    expect(result.id).toBeDefined();
  });
});

// ============================================================================
// COST CENTER TYPES (Tipos de Centros de Custo)
// ============================================================================
describe("costs.costCenterTypes", () => {
  it("should list cost center types", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.costs.costCenterTypes.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a cost center type", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const ts = Date.now();
    const result = await caller.costs.costCenterTypes.create({
      code: `COM${ts}`,
      name: `Comercial ${ts}`,
      description: "Departamento Comercial",
      icon: "🏪",
      color: "#3B82F6",
    });
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("should update a cost center type", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const ts = Date.now();
    const created = await caller.costs.costCenterTypes.create({
      code: `MKT${ts}`,
      name: `Marketing ${ts}`,
    });

    const result = await caller.costs.costCenterTypes.update({
      id: created.id!,
      name: "Marketing e Comunicação",
      color: "#F59E0B",
    });
    expect(result.success).toBe(true);
  });

  it("should delete a cost center type", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const ts = Date.now();
    const created = await caller.costs.costCenterTypes.create({
      code: `DEL${ts}`,
      name: `Para Deletar ${ts}`,
    });

    const result = await caller.costs.costCenterTypes.delete({
      id: created.id!,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// INDIRECT COST CATEGORIES (Categorias de Custos Indiretos)
// ============================================================================
describe("costs.indirectCostCategories", () => {
  it("should list indirect cost categories", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.costs.indirectCostCategories.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create an indirect cost category", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const ts = Date.now();
    const result = await caller.costs.indirectCostCategories.create({
      code: `CON${ts}`,
      name: `Consultoria ${ts}`,
      description: "Serviços de consultoria externa",
      icon: "📋",
      color: "#8B5CF6",
    });
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("should update an indirect cost category", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const ts = Date.now();
    const created = await caller.costs.indirectCostCategories.create({
      code: `SEG${ts}`,
      name: `Seguros ${ts}`,
    });

    const result = await caller.costs.indirectCostCategories.update({
      id: created.id!,
      name: "Seguros e Garantias",
      color: "#EF4444",
    });
    expect(result.success).toBe(true);
  });

  it("should delete an indirect cost category", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const ts = Date.now();
    const created = await caller.costs.indirectCostCategories.create({
      code: `DL${ts}`,
      name: `Para Deletar ${ts}`,
    });

    const result = await caller.costs.indirectCostCategories.delete({
      id: created.id!,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// STOCK RECONCILIATION (Reconciliação de Estoque)
// ============================================================================
describe("stockReconciliation", () => {
  it("should check warehouse items", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stockReconciliation.checkWarehouseItems();
    expect(result).toBeDefined();
    expect(result.checkedAt).toBeDefined();
  });

  it("should check skus", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stockReconciliation.checkSkus();
    expect(result).toBeDefined();
    expect(result.checkedAt).toBeDefined();
  });

  it("should check batches", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stockReconciliation.checkBatches();
    expect(result).toBeDefined();
    expect(result.checkedAt).toBeDefined();
  });

  it("should generate full report", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stockReconciliation.fullReport();
    expect(result).toBeDefined();
    expect(result.generatedAt).toBeDefined();
  });
});

// ============================================================================
// UPLOAD ROUTER
// ============================================================================
describe("upload", () => {
  it("should have the upload router available", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Verify the router exists (list is a valid operation)
    expect(caller.upload).toBeDefined();
  });
});
