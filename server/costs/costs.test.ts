import { describe, it, expect } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
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

const createCaller = () => {
  const ctx = createTestContext();
  return appRouter.createCaller(ctx);
};

describe("Costs Module - Cost Centers", () => {
  it("should list cost centers", async () => {
    const caller = createCaller();
    const result = await caller.costs.costCenters.list({});
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a cost center", async () => {
    const caller = createCaller();
    const timestamp = Date.now().toString().slice(-8);
    const newCenter = {
      code: `CC${timestamp}`,
      name: "Centro de Custo de Teste",
      type: "producao" as const,
      description: "Centro de custo criado para teste",
    };
    
    const result = await caller.costs.costCenters.create(newCenter);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);
  });
});

describe("Costs Module - Shipping Destinations", () => {
  it("should list shipping destinations", async () => {
    const caller = createCaller();
    const result = await caller.costs.destinations.list({});
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a shipping destination", async () => {
    const caller = createCaller();
    const timestamp = Date.now().toString().slice(-8);
    const newDestination = {
      code: `DST${timestamp}`,
      name: "Destino de Teste",
      state: "SP",
      region: "sudeste" as const,
      freightType: "valor_fixo" as const,
      freightFixedValue: 150.00,
      taxType: "formula" as const,
      icmsPercent: 18,
      pisPercent: 1.65,
      cofinsPercent: 7.60,
    };
    
    const result = await caller.costs.destinations.create(newDestination);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);
  });
});

describe("Costs Module - Monthly Indirect Costs", () => {
  it("should list monthly indirect costs", async () => {
    const caller = createCaller();
    const result = await caller.costs.indirectCosts.list({});
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a monthly indirect cost", async () => {
    const caller = createCaller();
    const currentPeriod = new Date().toISOString().slice(0, 7);
    
    const newCost = {
      period: currentPeriod,
      description: "Custo Indireto de Teste",
      category: "energia" as const,
      value: 5000.00,
    };
    
    const result = await caller.costs.indirectCosts.create(newCost);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);
  });

  it("should list indirect costs by period", async () => {
    const caller = createCaller();
    const currentPeriod = new Date().toISOString().slice(0, 7);
    
    const result = await caller.costs.indirectCosts.list({
      period: currentPeriod,
    });
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Costs Module - Cost Settings", () => {
  it("should set and get a cost setting", async () => {
    const caller = createCaller();
    const settingKey = `test_setting_${Date.now()}`;
    
    // Set the setting
    const setSetting = await caller.costs.settings.set({
      key: settingKey,
      value: "42",
      type: "number",
      description: "Test setting",
    });
    
    expect(setSetting).toBeDefined();
    expect(setSetting.success).toBe(true);
    
    // Get the setting
    const getSetting = await caller.costs.settings.get({ key: settingKey });
    
    expect(getSetting).toBeDefined();
    expect(getSetting?.settingValue).toBe("42");
  });

  it("should list all cost settings", async () => {
    const caller = createCaller();
    const result = await caller.costs.settings.list();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Costs Module - Cost Alerts", () => {
  it("should list cost alerts", async () => {
    const caller = createCaller();
    const result = await caller.costs.alerts.list({});
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get unread alert count", async () => {
    const caller = createCaller();
    const result = await caller.costs.alerts.getUnreadCount();
    
    expect(result).toBeDefined();
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe("Costs Module - Period Closures", () => {
  it("should list period closures", async () => {
    const caller = createCaller();
    const result = await caller.costs.periods.list();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get period by period string", async () => {
    const caller = createCaller();
    const currentPeriod = new Date().toISOString().slice(0, 7);
    
    const result = await caller.costs.periods.getByPeriod({
      period: currentPeriod,
    });
    
    // May be null if no closure exists
    expect(result === null || typeof result === "object").toBe(true);
  });
});

describe("Costs Module - Dashboard", () => {
  it("should get cost summary for a period", async () => {
    const caller = createCaller();
    const currentPeriod = new Date().toISOString().slice(0, 7);
    
    const result = await caller.costs.dashboard.getSummary({
      period: currentPeriod,
    });
    
    expect(result).toBeDefined();
    expect(typeof result.totalCosts).toBe("number");
    expect(typeof result.recordCount).toBe("number");
  });

  it("should get monthly comparison data", async () => {
    const caller = createCaller();
    
    const result = await caller.costs.dashboard.getMonthlyComparison({
      months: 6,
    });
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(6);
  });

  it("should get costs by SKU for a period", async () => {
    const caller = createCaller();
    const currentPeriod = new Date().toISOString().slice(0, 7);
    
    const result = await caller.costs.dashboard.getCostsBySku({
      period: currentPeriod,
    });
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Costs Module - Cost Records", () => {
  it("should list cost records", async () => {
    const caller = createCaller();
    const result = await caller.costs.records.list({});
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
