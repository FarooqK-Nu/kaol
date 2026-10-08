import { describe, it, expect } from "bun:test";
import path from "node:path";
import os from "node:os";
import { promises as fsPromises } from "node:fs";
import { findMonorepoRoot } from "../../src/config/repo-root";

describe("findMonorepoRoot (async)", () => {
  it("resolves the monorepo root directory containing package.json with workspaces", async () => {
    const root = await findMonorepoRoot(__dirname);
    expect(root).toBeDefined();

    const rootPackageJsonPath = path.join(root, "package.json");
    const raw = await fsPromises.readFile(rootPackageJsonPath, "utf-8");
    const parsed = JSON.parse(raw);

    expect(parsed.name).toBe("kaol-monorepo");
    expect(Array.isArray(parsed.workspaces)).toBe(true);
  });

  it("throws an error when starting in an isolated directory hierarchy without workspaces", async () => {
    const tempEmptyDir = path.join(
      os.tmpdir(),
      `kaol-test-noroot-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    await fsPromises.mkdir(tempEmptyDir, { recursive: true });

    try {
      await expect(findMonorepoRoot(tempEmptyDir)).rejects.toThrow(
        "Unable to locate monorepo root"
      );
    } finally {
      await fsPromises.rm(tempEmptyDir, { recursive: true, force: true }).catch(() => {});
    }
  });
});
