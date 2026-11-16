import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { app } from "../../src/main";
import { closeDbConnection } from "../../src/database/client/db";
import { closeRedisConnection } from "../../src/database/client/redis";
import type { Server } from "node:http";

describe("Health API Integration", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === "object" && addr ? addr.port : 3001;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("GET /api/health returns 200 with database and redis connected", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      status: string;
      services: { database: string; redis: string };
    };

    expect(data.status).toBe("ok");
    expect(data.services.database).toBe("connected");
    expect(data.services.redis).toBe("connected");
  });

  it("GET /api/ping returns 200 ok", async () => {
    const res = await fetch(`${baseUrl}/api/ping`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as { status: string; service: string };
    expect(data.status).toBe("ok");
    expect(data.service).toBe("api");
  });
});
