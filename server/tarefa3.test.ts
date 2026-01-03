import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock do db.ts
vi.mock("./db", () => ({
  getAllUsers: vi.fn().mockResolvedValue([
    { id: 1, name: "Admin", email: "admin@test.com", role: "admin", status: "ativo" },
    { id: 2, name: "User", email: "user@test.com", role: "user", status: "ativo" },
  ]),
  getUserById: vi.fn().mockResolvedValue({
    id: 1, name: "Admin", email: "admin@test.com", role: "admin", status: "ativo"
  }),
  updateUser: vi.fn().mockResolvedValue(undefined),
  blockUser: vi.fn().mockResolvedValue(undefined),
  unblockUser: vi.fn().mockResolvedValue(undefined),
  getOnlineUsers: vi.fn().mockResolvedValue([
    { sessionId: "sess1", userId: 1, userName: "Admin", currentModule: "Dashboard", loginAt: new Date() }
  ]),
  endSession: vi.fn().mockResolvedValue(undefined),
  getAuditLogs: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, userName: "Admin", action: "CREATE", module: "produtores", createdAt: new Date() }
  ]),
  getSecurityAlerts: vi.fn().mockResolvedValue([
    { id: 1, alertType: "login_falho", priority: "alta", description: "Tentativa de login falha", isRead: false }
  ]),
  getUnreadAlertsCount: vi.fn().mockResolvedValue(5),
  markAlertAsRead: vi.fn().mockResolvedValue(undefined),
  getSystemSettings: vi.fn().mockResolvedValue([
    { id: 1, settingKey: "empresa_nome", settingValue: "Coco Litorâneo", category: "empresa" }
  ]),
  getSystemSetting: vi.fn().mockResolvedValue("Coco Litorâneo"),
  upsertSystemSetting: vi.fn().mockResolvedValue(undefined),
  getActiveSessions: vi.fn().mockResolvedValue([
    { sessionId: "sess1", userId: 1, isActive: true, loginAt: new Date() }
  ]),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  createSecurityAlert: vi.fn().mockResolvedValue(1),
}));

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

function createAdminContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@test.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

function createUserContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: {
      id: 2,
      openId: "normal-user",
      email: "user@test.com",
      name: "Normal User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("Tarefa 3: Administração e Segurança", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("admin.users", () => {
    it("admin pode listar usuários", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.users.list({});
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Admin");
    });

    it("usuário comum não pode listar usuários", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.admin.users.list({})).rejects.toThrow("Acesso negado");
    });

    it("admin pode obter usuário por ID", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.users.getById({ id: 1 });
      expect(result.name).toBe("Admin");
    });

    it("admin pode atualizar usuário", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.users.update({
        id: 1,
        name: "Admin Atualizado",
        role: "admin",
      });
      expect(result.success).toBe(true);
    });

    it("admin pode bloquear usuário", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.users.block({ id: 2 });
      expect(result.success).toBe(true);
    });

    it("admin pode desbloquear usuário", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.users.unblock({ id: 2 });
      expect(result.success).toBe(true);
    });
  });

  describe("admin.onlineUsers", () => {
    it("admin pode listar usuários online", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.onlineUsers.list();
      expect(result).toHaveLength(1);
      expect(result[0].userName).toBe("Admin");
    });

    it("admin pode forçar logout de sessão", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.onlineUsers.forceLogout({ sessionId: "sess1" });
      expect(result.success).toBe(true);
    });
  });

  describe("admin.auditLogs", () => {
    it("admin pode listar logs de auditoria", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.auditLogs.list({});
      expect(result).toHaveLength(1);
      expect(result[0].action).toBe("CREATE");
    });

    it("usuário comum não pode listar logs", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.admin.auditLogs.list({})).rejects.toThrow("Acesso negado");
    });
  });

  describe("admin.securityAlerts", () => {
    it("admin pode listar alertas de segurança", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.securityAlerts.list({});
      expect(result).toHaveLength(1);
      expect(result[0].alertType).toBe("login_falho");
    });

    it("admin pode obter contagem de alertas não lidos", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.securityAlerts.unreadCount();
      expect(result).toBe(5);
    });

    it("admin pode marcar alerta como lido", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.securityAlerts.markAsRead({ id: 1 });
      expect(result.success).toBe(true);
    });
  });

  describe("admin.settings", () => {
    it("admin pode listar configurações", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.settings.list({});
      expect(result).toHaveLength(1);
      expect(result[0].settingKey).toBe("empresa_nome");
    });

    it("admin pode obter configuração específica", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.settings.get({ key: "empresa_nome" });
      expect(result).toBe("Coco Litorâneo");
    });

    it("admin pode atualizar configuração", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.settings.update({
        key: "empresa_nome",
        value: "Coco Litorâneo LTDA",
        type: "string",
        category: "empresa",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("admin.sessions", () => {
    it("admin pode listar sessões ativas", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.sessions.list({});
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });
  });
});
