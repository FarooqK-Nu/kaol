import Redis from "ioredis";
import { env } from "../../config/env";

export const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 100, 2000);
  },
  lazyConnect: true,
});

redisClient.on("error", (err) => {
  // Avoid unhandled errors crashing the process during network reconnects
  if (env.NODE_ENV !== "test") {
    console.warn("[Redis] Client warning/error:", err.message);
  }
});

export async function checkRedisConnection(): Promise<boolean> {
  try {
    if (redisClient.status === "wait") {
      await redisClient.connect();
    }
    const pong = await redisClient.ping();
    return pong === "PONG";
  } catch (error) {
    return false;
  }
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient.status !== "end") {
    await redisClient.quit().catch(() => redisClient.disconnect());
  }
}
