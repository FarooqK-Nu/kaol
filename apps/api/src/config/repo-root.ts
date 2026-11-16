import { promises as fsPromises } from "node:fs";
import path from "node:path";

/**
 * Dynamically resolves the monorepo root directory by traversing upward
 * until a package.json containing a "workspaces" field is encountered.
 * Uses asynchronous filesystem operations to prevent blocking the event loop.
 */
export async function findMonorepoRoot(startDir: string = __dirname): Promise<string> {
  let current = path.resolve(startDir);
  while (true) {
    const pkgPath = path.join(current, "package.json");
    try {
      const raw = await fsPromises.readFile(pkgPath, "utf-8");
      const content = JSON.parse(raw);
      if (content && typeof content === "object" && content.workspaces) {
        return current;
      }
    } catch {
      // Continue climbing if file does not exist or cannot be parsed
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error("Unable to locate monorepo root (package.json with 'workspaces' not found)");
    }
    current = parent;
  }
}
