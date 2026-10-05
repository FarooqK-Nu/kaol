import path from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, closeDbConnection } from "./client/db";

export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.resolve(import.meta.dirname, "migrations");
  console.log(`[Migrations] Applying migrations from ${migrationsFolder}...`);
  await migrate(db, { migrationsFolder });
  console.log("[Migrations] Migrations applied successfully.");
}

if (import.meta.main) {
  runMigrations()
    .then(async () => {
      await closeDbConnection();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[Migrations] Migration execution failed:", err);
      await closeDbConnection();
      process.exit(1);
    });
}
