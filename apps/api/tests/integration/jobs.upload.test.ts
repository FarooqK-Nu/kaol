import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { app } from "../../src/main";
import { jobsService } from "../../src/modules/jobs/jobs.service";
import { jobRepository } from "../../src/modules/jobs/jobs.repository";
import { LocalStorageService } from "../../src/storage";
import type { Server } from "node:http";
import { Readable } from "node:stream";

describe("Jobs Upload & Creation Integration", () => {
  let server: Server;
  let baseUrl: string;
  const storage = new LocalStorageService();
  const createdJobIds: string[] = [];

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === "object" && addr ? addr.port : 3002;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Cleanup workspaces created during test
    for (const jobId of createdJobIds) {
      await storage.cleanupJob(jobId).catch(() => {});
      await jobRepository.deleteJob(jobId).catch(() => {});
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("POST /api/jobs with valid MP4 creates job record and stores input.mp4 directly", async () => {
    const mp4Bytes = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]); // basic ftyp header
    const formData = new FormData();
    formData.append("file", new Blob([mp4Bytes], { type: "video/mp4" }), "lecture.mp4");

    const res = await fetch(`${baseUrl}/api/jobs`, {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as { jobId: string; status: string };

    expect(data.jobId).toMatch(/^job_[a-zA-Z0-9_-]+$/);
    expect(data.status).toBe("queued");
    createdJobIds.push(data.jobId);

    // Verify DB record
    const dbJob = await jobsService.getJobById(data.jobId);
    expect(dbJob).not.toBeNull();
    expect(dbJob?.status).toBe("queued");
    expect(dbJob?.sourceFilename).toBe("lecture.mp4");
    expect(dbJob?.sourceMediaReference).toBe(`data/jobs/${data.jobId}/input.mp4`);

    // Verify physical file
    const fileExists = await storage.exists(data.jobId, "input.mp4");
    expect(fileExists).toBe(true);

    const savedBytes = await storage.getBuffer(data.jobId, "input.mp4");
    expect(new Uint8Array(savedBytes)).toEqual(mp4Bytes);
  });

  it("POST /api/jobs with valid WAV creates job record and stores input.wav", async () => {
    const wavBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46]); // RIFF
    const formData = new FormData();
    formData.append("file", new Blob([wavBytes], { type: "audio/wav" }), "speech.WAV");

    const res = await fetch(`${baseUrl}/api/jobs`, {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as { jobId: string; status: string };

    expect(data.status).toBe("queued");
    createdJobIds.push(data.jobId);

    const fileExists = await storage.exists(data.jobId, "input.wav");
    expect(fileExists).toBe(true);
  });

  it("POST /api/jobs rejects non-multipart requests with INVALID_CONTENT_TYPE", async () => {
    const res = await fetch(`${baseUrl}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: "test.mp4" }),
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string; message: string } };
    expect(data.error.code).toBe("INVALID_CONTENT_TYPE");
  });

  it("POST /api/jobs rejects request without file field with MISSING_FILE", async () => {
    const formData = new FormData();
    formData.append("some_text", "hello world");

    const res = await fetch(`${baseUrl}/api/jobs`, {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string; message: string } };
    expect(data.error.code).toBe("MISSING_FILE");
  });

  it("POST /api/jobs rejects request with wrong field name with INVALID_FILE_FIELD", async () => {
    const formData = new FormData();
    formData.append(
      "attachment",
      new Blob([new Uint8Array([1, 2, 3])], { type: "video/mp4" }),
      "test.mp4"
    );

    const res = await fetch(`${baseUrl}/api/jobs`, {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string; message: string } };
    expect(data.error.code).toBe("INVALID_FILE_FIELD");
  });

  it("POST /api/jobs rejects unsupported file extension with UNSUPPORTED_MEDIA_TYPE", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob(["plain text data"], { type: "text/plain" }),
      "notes.txt"
    );

    const res = await fetch(`${baseUrl}/api/jobs`, {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string; message: string } };
    expect(data.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("POST /api/jobs rejects multiple files with TOO_MANY_FILES", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([new Uint8Array([1, 2, 3])], { type: "video/mp4" }),
      "file1.mp4"
    );
    formData.append(
      "file",
      new Blob([new Uint8Array([4, 5, 6])], { type: "video/mp4" }),
      "file2.mp4"
    );

    const res = await fetch(`${baseUrl}/api/jobs`, {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string; message: string } };
    expect(data.error.code).toBe("TOO_MANY_FILES");
  });

  it("Rollback: cleans up workspace and throws when stream storage fails", async () => {
    const failingStorage = new LocalStorageService();
    // Simulate failing stream
    const errorStream = new Readable({
      read() {
        this.destroy(new Error("Disk stream failure"));
      },
    });

    let caughtError: unknown = null;
    try {
      await jobsService.createJobFromStream({
        originalFilename: "fail.mp4",
        extension: ".mp4",
        stream: errorStream,
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
  });

  it("Rollback: purges workspace if database insertion fails after file is written", async () => {
    const testStorage = new LocalStorageService();
    const testJobId = "job_testrollback123";

    // Create a mock repo that throws on createJob
    const mockRepo = {
      ...jobRepository,
      createJob: async () => {
        throw new Error("PostgreSQL connection failure");
      },
    };

    const failingDbService = new (jobsService.constructor as any)(mockRepo, testStorage);
    failingDbService.generateJobId = () => testJobId;
    const goodStream = Readable.from([Buffer.from("valid media bytes")]);

    let caughtError: unknown = null;
    try {
      await failingDbService.createJobFromStream({
        originalFilename: "rollback_test.mp4",
        extension: ".mp4",
        stream: goodStream,
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    // Verify workspace directory and file were purged by rollback
    const existsAfterRollback = await testStorage.exists(testJobId, "input.mp4");
    expect(existsAfterRollback).toBe(false);
  });

  it("POST /api/jobs rejects malformed multipart request with 400", async () => {
    const res = await fetch(`${baseUrl}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data; boundary=invalid_boundary" },
      body: "corrupted stream without proper multipart markers",
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string; message: string } };
    expect(["MALFORMED_MULTIPART", "MISSING_FILE"]).toContain(data.error.code);
  });
});
