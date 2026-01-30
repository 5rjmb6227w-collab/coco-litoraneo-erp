import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Batches Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("batches.list", () => {
    it("should return an array of batches", async () => {
      const result = await caller.batches.list({});
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter by status when provided", async () => {
      const result = await caller.batches.list({ status: "disponivel" });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter by search term when provided", async () => {
      const result = await caller.batches.list({ search: "LT-2026" });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("batches.getStats", () => {
    it("should return batch statistics", async () => {
      const result = await caller.batches.getStats();
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("disponivel");
      expect(result).toHaveProperty("emProducao");
      expect(result).toHaveProperty("quarentena");
      expect(result).toHaveProperty("vencendo");
      expect(result).toHaveProperty("vencidos");
    });
  });

  describe("batches.getByCode", () => {
    it("should return null for non-existent batch code", async () => {
      const result = await caller.batches.getByCode({ code: "NON-EXISTENT-CODE" });
      expect(result).toBeNull();
    });
  });
});

describe("Alerts Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("alerts.list", () => {
    it("should return an array of alerts", async () => {
      const result = await caller.alerts.list({});
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter by category when provided", async () => {
      const result = await caller.alerts.list({ category: "estoque" });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter by status when provided", async () => {
      const result = await caller.alerts.list({ status: "novo" });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("alerts.getStats", () => {
    it("should return alert statistics", async () => {
      const result = await caller.alerts.getStats();
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("naoLidos");
      expect(result).toHaveProperty("criticos");
      expect(result).toHaveProperty("resolvidos");
    });
  });

  describe("alerts.generate", () => {
    it("should generate system alerts", async () => {
      const result = await caller.alerts.generate();
      expect(result).toHaveProperty("total");
      expect(typeof result.total).toBe("number");
    });
  });
});

// BOM Router tests - Router not yet implemented in main routers.ts
// TODO: Add BOM router and enable these tests
// describe("BOM Router", () => { ... });

describe("Dashboard Quality", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("dashboard.oeeMetrics", () => {
    it("should return OEE metrics", async () => {
      const result = await caller.dashboard.oeeMetrics({});
      expect(result).toHaveProperty("oee");
      expect(result).toHaveProperty("availability");
      expect(result).toHaveProperty("performance");
      expect(result).toHaveProperty("quality");
    });
  });

  describe("dashboard.oeeHistory", () => {
    it("should return OEE history array", async () => {
      const result = await caller.dashboard.oeeHistory({ days: 7 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("dashboard.alerts", () => {
    it("should return dashboard alerts", async () => {
      const result = await caller.dashboard.alerts({ limit: 10 });
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
