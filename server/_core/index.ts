import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initSentry, sentryErrorHandler } from "../sentry";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Inicializar Sentry antes de qualquer middleware
  initSentry();

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // ============================================================================
  // HEALTH CHECK ENDPOINT
  // ============================================================================
  app.get("/api/health", async (_req, res) => {
    const startTime = Date.now();
    const healthData: Record<string, unknown> = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: "MB",
      },
      nodeVersion: process.version,
    };

    // Verificar conexão com banco de dados
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (db) {
        const { sql } = await import("drizzle-orm");
        await db.execute(sql`SELECT 1`);
        healthData.database = {
          status: "connected",
          latencyMs: Date.now() - startTime,
        };
      } else {
        healthData.database = { status: "disconnected" };
        healthData.status = "degraded";
      }
    } catch (err) {
      healthData.database = {
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      };
      healthData.status = "degraded";
    }

    healthData.responseTimeMs = Date.now() - startTime;

    const statusCode = healthData.status === "ok" ? 200 : 503;
    res.status(statusCode).json(healthData);
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
