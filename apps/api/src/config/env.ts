import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";
import { findMonorepoRoot } from "./repo-root";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  API_PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required in .env"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  CORS_ORIGIN: z.string().default("*"),
  STORAGE_LOCAL_ROOT: z.string().default("data/jobs"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(200),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[Config] Invalid environment variables:", parsed.error.format());
  throw new Error("Invalid environment configuration: DATABASE_URL is required in .env");
}

export const env = parsed.data;

let cachedRepoRoot: string | null = null;

/**
 * Returns the deterministic absolute storage root path anchored to the monorepo root.
 */
export async function getResolvedStorageRoot(overridePath?: string): Promise<string> {
  const target = overridePath ?? env.STORAGE_LOCAL_ROOT;
  if (path.isAbsolute(target)) {
    return path.resolve(target);
  }
  if (!cachedRepoRoot) {
    cachedRepoRoot = await findMonorepoRoot(__dirname);
  }
  // Strip leading directory climbs if set relative to apps/api in legacy .env
  const sanitizedRel = target.replace(/^(\.\.[/\\])+/, "");
  return path.resolve(cachedRepoRoot, sanitizedRel);
}
