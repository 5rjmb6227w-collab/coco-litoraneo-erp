import * as Sentry from "@sentry/node";

/**
 * Inicializa o Sentry no servidor Express.
 * A DSN é lida da variável de ambiente SENTRY_DSN.
 * Se não estiver configurada, o Sentry fica desabilitado (sem erro).
 */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.log("[Sentry] DSN não configurada — error tracking desabilitado");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 0.2, // 20% das transações para performance
    profilesSampleRate: 0.1,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });

  console.log("[Sentry] Inicializado com sucesso no servidor");
}

/**
 * Middleware de erro do Sentry para Express.
 * Deve ser registrado DEPOIS de todas as rotas.
 */
export function sentryErrorHandler() {
  return Sentry.expressErrorHandler();
}

/**
 * Captura uma exceção manualmente no Sentry.
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext("additional", context);
  }
  Sentry.captureException(error);
}

/**
 * Captura uma mensagem manualmente no Sentry.
 */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  Sentry.captureMessage(message, level);
}

export { Sentry };
