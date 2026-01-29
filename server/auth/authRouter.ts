import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as authService from "./authService";

export const authLocalRouter = router({
  // Login com email/senha
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const deviceInfo = ctx.req.headers["user-agent"] || undefined;
      const ipAddress = ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString();
      
      const result = await authService.loginWithCredentials(
        input.email,
        input.password,
        deviceInfo,
        ipAddress,
        deviceInfo
      );
      
      if (result.success && result.sessionToken && !result.requires2FA) {
        // Definir cookie de sessão
        ctx.res.cookie("session_token", result.sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 24 * 60 * 60 * 1000, // 24 horas
        });
      }
      
      return result;
    }),

  // Verificar código 2FA
  verify2FA: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      code: z.string().length(6),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await authService.verify2FA(input.sessionToken, input.code);
      
      if (result.success) {
        // Definir cookie de sessão
        ctx.res.cookie("session_token", input.sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 24 * 60 * 60 * 1000,
        });
      }
      
      return result;
    }),

  // Configurar 2FA
  setup2FA: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.user?.id) {
        return { success: false, error: "Usuário não autenticado" };
      }
      return authService.setup2FA(ctx.user.id);
    }),

  // Confirmar configuração 2FA
  confirm2FA: protectedProcedure
    .input(z.object({
      code: z.string().length(6),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        return { success: false, error: "Usuário não autenticado" };
      }
      return authService.confirm2FA(ctx.user.id, input.code);
    }),

  // Solicitar reset de senha
  requestPasswordReset: publicProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      const result = await authService.createPasswordResetToken(input.email);
      // Aqui você enviaria o email com o token
      // Por segurança, sempre retornamos sucesso
      return { success: true, message: "Se o email existir, você receberá instruções de recuperação." };
    }),

  // Resetar senha com token
  resetPassword: publicProcedure
    .input(z.object({
      token: z.string(),
      newPassword: z.string().min(8),
    }))
    .mutation(async ({ input }) => {
      return authService.resetPassword(input.token, input.newPassword);
    }),

  // Alterar senha (usuário logado)
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        return { success: false, error: "Usuário não autenticado" };
      }
      return authService.changePassword(ctx.user.id, input.currentPassword, input.newPassword);
    }),

  // Logout local
  logoutLocal: protectedProcedure
    .mutation(async ({ ctx }) => {
      const sessionToken = ctx.req.cookies?.session_token;
      if (sessionToken) {
        await authService.logout(sessionToken);
      }
      ctx.res.clearCookie("session_token");
      return { success: true };
    }),

  // Listar sessões ativas
  listSessions: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user?.id) return [];
      return authService.getUserSessions(ctx.user.id);
    }),

  // Invalidar todas as sessões
  invalidateAllSessions: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.user?.id) {
        return { success: false, error: "Usuário não autenticado" };
      }
      await authService.invalidateAllSessions(ctx.user.id);
      ctx.res.clearCookie("session_token");
      return { success: true };
    }),

  // Criar credenciais para usuário existente (admin only)
  createCredentials: protectedProcedure
    .input(z.object({
      userId: z.number(),
      email: z.string().email(),
      password: z.string().min(8),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verificar se é admin
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "ceo") {
        return { success: false, error: "Apenas administradores podem criar credenciais" };
      }
      return authService.createUserCredentials(input.userId, input.email, input.password);
    }),

  // Verificar status de 2FA do usuário
  get2FAStatus: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user?.id) {
        return { enabled: false, configured: false };
      }
      
      const { getDb } = await import("../db");
      const { userTwoFactor } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const db = await getDb();
      if (!db) return { enabled: false, configured: false };
      
      const twoFactor = await db
        .select()
        .from(userTwoFactor)
        .where(eq(userTwoFactor.userId, ctx.user.id))
        .limit(1);
      
      if (twoFactor.length === 0) {
        return { enabled: false, configured: false };
      }
      
      return {
        enabled: twoFactor[0].enabled,
        configured: true,
        method: twoFactor[0].method,
        verifiedAt: twoFactor[0].verifiedAt,
      };
    }),
});
