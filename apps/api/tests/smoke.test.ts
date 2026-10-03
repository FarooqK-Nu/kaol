import { describe, expect, it } from "bun:test";
import type { JobStatus } from "@kaol/shared-types";

describe("API Foundation Smoke Tests", () => {
  it("resolves shared types cleanly", () => {
    const status: JobStatus = "queued";
    expect(status).toBe("queued");
  });
});
