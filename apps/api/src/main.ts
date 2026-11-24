import express, { type Express } from "express";
import cors from "cors";
import { env } from "./config/env";
import { getHealth } from "./modules/health/health.controller";
import { jobsRouter } from "./modules/jobs/jobs.router";
import { closeDbConnection } from "./database/client/db";
import { closeRedisConnection } from "./database/client/redis";

export const app: Express = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

// Public health & ping endpoints
app.get("/api/health", getHealth);
app.get("/api/ping", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "api",
  });
});

// Jobs routes
app.use("/api/jobs", jobsRouter);

// Global error handler for public error compliance
app.use((_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
  });
});

let server: ReturnType<typeof app.listen> | null = null;

if (env.NODE_ENV !== "test") {
  server = app.listen(env.API_PORT, () => {
    console.log(`[API] Server listening on http://localhost:${env.API_PORT}`);
  });
}

export async function stopServer(): Promise<void> {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((err) => (err ? reject(err) : resolve()));
    });
  }
  await closeDbConnection();
  await closeRedisConnection();
}

// Graceful shutdown
const handleShutdown = async (signal: string) => {
  console.log(`[API] Received ${signal}, closing gracefully...`);
  await stopServer();
  process.exit(0);
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
