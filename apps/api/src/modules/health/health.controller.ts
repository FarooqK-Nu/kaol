import type { Request, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "../../database/client/db";
import { checkRedisConnection } from "../../database/client/redis";

export interface HealthCheckResponse {
  status: "ok" | "degraded";
  services: {
    database: "connected" | "disconnected";
    redis: "connected" | "disconnected";
  };
}

export async function getHealth(_req: Request, res: Response): Promise<void> {
  let dbStatus: "connected" | "disconnected" = "disconnected";
  let redisStatus: "connected" | "disconnected" = "disconnected";

  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = "connected";
  } catch (error) {
    dbStatus = "disconnected";
  }

  try {
    const isRedisOk = await checkRedisConnection();
    redisStatus = isRedisOk ? "connected" : "disconnected";
  } catch (error) {
    redisStatus = "disconnected";
  }

  const isHealthy = dbStatus === "connected" && redisStatus === "connected";
  const statusCode = isHealthy ? 200 : 503;

  const responseBody: HealthCheckResponse = {
    status: isHealthy ? "ok" : "degraded",
    services: {
      database: dbStatus,
      redis: redisStatus,
    },
  };

  res.status(statusCode).json(responseBody);
}
