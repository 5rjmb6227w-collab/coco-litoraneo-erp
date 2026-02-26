import * as Sentry from "@sentry/react";

/**
 * Inicializa o Sentry no frontend React.
 * A DSN é lida da variável de ambiente VITE_SENTRY_DSN.
 * Se não estiver configurada, o Sentry fica desabilitado (sem erro).
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.log("[Sentry] DSN não configurada — error tracking desabilitado no frontend");
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || "development",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
  });

  console.log("[Sentry] Inicializado com sucesso no frontend");
}

/**
 * ErrorBoundary do Sentry para React.
 * Envolve componentes para capturar erros de renderização.
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Captura uma exceção manualmente no frontend.
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext("additional", context);
  }
  Sentry.captureException(error);
}

/**
 * Define o usuário atual no Sentry para contexto nos erros.
 */
export function setUser(user: { id: string; email?: string; name?: string } | null) {
  if (user) {
    Sentry.setUser(user);
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
