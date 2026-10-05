import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../../config/env";
import * as schema from "../schema";

export const sqlClient = postgres(env.DATABASE_URL, {
  max: env.NODE_ENV === "test" ? 5 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(sqlClient, { schema });

export async function closeDbConnection(): Promise<void> {
  await sqlClient.end();
}
