import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  getDashboardStats: vi.fn().mockResolvedValue({
    production: { total: 1500, count: 25 },
    loads: { count: 10, totalWeight: 5000 },
    payables: { pending: 25000, overdue: 5000 },
    purchases: { pending: 3 },
    ncs: { open: 2 },
    employees: { active: 15 },
  }),
  getProductionBySkuVariation: vi.fn().mockResolvedValue([
    { sku: "Coco Ralado Seco", variation: "flocos", total: 500 },
    { sku: "Coco Ralado Seco", variation: "medio", total: 300 },
    { sku: "Coco Ralado Seco", variation: "fino", total: 200 },
  ]),
  getProductionByShift: vi.fn().mockResolvedValue([
    { shift: "manha", total: 600 },
    { shift: "tarde", total: 500 },
    { shift: "noite", total: 400 },
  ]),
  getTopProducersByVolume: vi.fn().mockResolvedValue([
    { producerId: 1, producerName: "Produtor A", totalWeight: 2000 },
    { producerId: 2, producerName: "Produtor B", totalWeight: 1500 },
  ]),
  getLoadsEvolution: vi.fn().mockResolvedValue([
    { date: "2025-01-01", totalWeight: 1000, count: 2 },
    { date: "2025-01-02", totalWeight: 1500, count: 3 },
  ]),
  getPaymentsByStatus: vi.fn().mockResolvedValue([
    { status: "pendente", total: 15000, count: 5 },
    { status: "pago", total: 10000, count: 3 },
  ]),
  getUpcomingPayments: vi.fn().mockResolvedValue([
    { id: 1, producerName: "Produtor A", dueDate: "2025-01-10", totalAmount: 5000 },
  ]),
  getStockAlerts: vi.fn().mockResolvedValue({
    warehouse: [
      { id: 1, name: "Açúcar", currentStock: 50, minimumStock: 100, unit: "kg" },
    ],
    skus: [],
  }),
  getExpiringProducts: vi.fn().mockResolvedValue([
    { id: 1, skuCode: "CRS-001", batchNumber: "L001", expirationDate: "2025-01-15", quantity: 100 },
  ]),
  getNcsByMonth: vi.fn().mockResolvedValue([
    { month: "2025-01", count: 2 },
    { month: "2024-12", count: 3 },
  ]),
  getConformityIndex: vi.fn().mockResolvedValue({
    total: 100,
    conforming: 95,
    percentage: 95,
  }),
  globalSearch: vi.fn().mockResolvedValue({
    producers: [{ id: 1, name: "Produtor Teste" }],
    loads: [],
    employees: [],
    warehouse: [],
    skus: [],
    ncs: [],
  }),
  // Mocks necessários para outros routers
  getProducers: vi.fn().mockResolvedValue([]),
  getCoconutLoads: vi.fn().mockResolvedValue([]),
  getProducerPayables: vi.fn().mockResolvedValue([]),
  getWarehouseItems: vi.fn().mockResolvedValue([]),
  getSkus: vi.fn().mockResolvedValue([]),
  seedWarehouseItemsProducao: vi.fn().mockResolvedValue(undefined),
  seedWarehouseItemsGerais: vi.fn().mockResolvedValue(undefined),
  seedSkus: vi.fn().mockResolvedValue(undefined),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
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
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("dashboard router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("stats", () => {
    it("returns dashboard statistics", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.stats({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      });

      expect(result).toBeDefined();
      expect(result.production).toBeDefined();
      expect(result.loads).toBeDefined();
      expect(result.payables).toBeDefined();
    });

    it("works without date range", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.stats();

      expect(result).toBeDefined();
    });
  });

  describe("productionBySkuVariation", () => {
    it("returns production data grouped by SKU and variation", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.productionBySkuVariation({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("productionByShift", () => {
    it("returns production data grouped by shift", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.productionByShift({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("topProducers", () => {
    it("returns top producers by volume", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.topProducers({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
        limit: 5,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("loadsEvolution", () => {
    it("returns loads evolution over time", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.loadsEvolution({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("paymentsByStatus", () => {
    it("returns payments grouped by status", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.paymentsByStatus();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("upcomingPayments", () => {
    it("returns upcoming payments within specified days", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.upcomingPayments({ days: 7 });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("stockAlerts", () => {
    it("returns stock alerts for items below minimum", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.stockAlerts();

      expect(result).toBeDefined();
      expect(result.warehouse).toBeDefined();
    });
  });

  describe("expiringProducts", () => {
    it("returns products expiring within specified days", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.expiringProducts({ days: 30 });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("ncsByMonth", () => {
    it("returns non-conformities grouped by month", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.ncsByMonth({ months: 6 });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("conformityIndex", () => {
    it("returns conformity index statistics", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboard.conformityIndex({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      });

      expect(result).toBeDefined();
      expect(result.percentage).toBeDefined();
    });
  });
});

describe("search router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("global", () => {
    it("returns search results across all modules", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.search.global({ query: "teste" });

      expect(result).toBeDefined();
      expect(result.producers).toBeDefined();
      expect(result.loads).toBeDefined();
      expect(result.employees).toBeDefined();
    });

    it("requires minimum 3 characters", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.search.global({ query: "ab" })).rejects.toThrow();
    });
  });
});
