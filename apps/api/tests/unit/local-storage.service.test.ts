import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import { promises as fsPromises } from "node:fs";
import path from "node:path";
import os from "node:os";
import { Readable } from "node:stream";
import {
  LocalStorageService,
  StoragePathTraversalError,
  StorageFileNotFoundError,
  InvalidJobIdError,
  InvalidFilenameError,
} from "../../src/storage";

describe("LocalStorageService", () => {
  let tempStorageRoot: string;
  let storage: LocalStorageService;
  const validJobId = "job_test123456";

  beforeEach(async () => {
    tempStorageRoot = path.join(os.tmpdir(), `kaol-test-storage-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fsPromises.mkdir(tempStorageRoot, { recursive: true });
    storage = new LocalStorageService(tempStorageRoot);
  });

  afterEach(async () => {
    await fsPromises.rm(tempStorageRoot, { recursive: true, force: true }).catch(() => {});
  });

  describe("Workspace lifecycle and operations", () => {
    it("creates an isolated workspace directory", async () => {
      await storage.createJobWorkspace(validJobId);
      const jobDir = await storage.getResolvedJobDirectory(validJobId);
      expect(fs.existsSync(jobDir)).toBe(true);
    });

    it("saves and retrieves buffer content accurately", async () => {
      const buffer = Buffer.from([1, 2, 3, 4, 5, 255]);
      await storage.saveBuffer(validJobId, "data.bin", buffer);

      const retrieved = await storage.getBuffer(validJobId, "data.bin");
      expect(retrieved).toEqual(buffer);
      expect(await storage.exists(validJobId, "data.bin")).toBe(true);
    });

    it("saves and retrieves UTF-8 text including Arabic characters", async () => {
      const arabicContent = "مرحبا بالعالم - مرحلة التحويل الصوتي والنصوص";
      await storage.saveText(validJobId, "arabic.txt", arabicContent);

      const retrieved = await storage.getText(validJobId, "arabic.txt");
      expect(retrieved).toBe(arabicContent);
    });

    it("streams content into storage and retrieves readable stream", async () => {
      const streamData = "Chunk 1: Hello | Chunk 2: World | Chunk 3: Audio Stream";
      const readable = Readable.from([
        Buffer.from("Chunk 1: Hello | "),
        Buffer.from("Chunk 2: World | "),
        Buffer.from("Chunk 3: Audio Stream"),
      ]);

      await storage.saveStream(validJobId, "streamed.txt", readable);

      const readStream = await storage.getStream(validJobId, "streamed.txt");
      const chunks: Buffer[] = [];
      for await (const chunk of readStream) {
        chunks.push(Buffer.from(chunk));
      }
      const fullText = Buffer.concat(chunks).toString("utf-8");
      expect(fullText).toBe(streamData);
    });

    it("cleans up dot-prefixed temporary file on stream failure", async () => {
      const failingStream = new Readable({
        read() {
          this.destroy(new Error("Stream read error simulated"));
        },
      });

      await expect(storage.saveStream(validJobId, "failed.txt", failingStream)).rejects.toThrow(
        "Stream read error simulated"
      );

      const jobDir = await storage.getResolvedJobDirectory(validJobId);
      expect(fs.existsSync(path.join(jobDir, "failed.txt"))).toBe(false);

      // Verify no leftover dot-prefixed temporary files
      if (fs.existsSync(jobDir)) {
        const files = await fsPromises.readdir(jobDir);
        const tempFiles = files.filter((f) => f.startsWith(".failed.txt."));
        expect(tempFiles.length).toBe(0);
      }
    });

    it("deletes a specific file and throws for non-existent file", async () => {
      await storage.saveText(validJobId, "temp.txt", "to be deleted");
      expect(await storage.exists(validJobId, "temp.txt")).toBe(true);

      await storage.delete(validJobId, "temp.txt");
      expect(await storage.exists(validJobId, "temp.txt")).toBe(false);

      await expect(storage.delete(validJobId, "temp.txt")).rejects.toThrow(StorageFileNotFoundError);
    });

    it("throws StorageFileNotFoundError when accessing non-existent files", async () => {
      await expect(storage.getBuffer(validJobId, "missing.bin")).rejects.toThrow(StorageFileNotFoundError);
      await expect(storage.getText(validJobId, "missing.txt")).rejects.toThrow(StorageFileNotFoundError);
      await expect(storage.getStream(validJobId, "missing.wav")).rejects.toThrow(StorageFileNotFoundError);
    });

    it("cleans up the entire job workspace", async () => {
      await storage.saveText(validJobId, "file1.txt", "one");
      await storage.saveText(validJobId, "file2.txt", "two");

      const jobDir = await storage.getResolvedJobDirectory(validJobId);
      expect(fs.existsSync(jobDir)).toBe(true);

      await storage.cleanupJob(validJobId);
      expect(fs.existsSync(jobDir)).toBe(false);
    });
  });

  describe("Security and path validation matrix", () => {
    describe("Job ID validation", () => {
      it("rejects job IDs that are too short (<10 chars)", () => {
        expect(() => storage.validateJobId("job_1")).toThrow(InvalidJobIdError);
        expect(() => storage.validateJobId("job_1234")).toThrow(InvalidJobIdError);
      });

      it("rejects job IDs that are too long (>64 chars)", () => {
        const overlyLongId = "job_" + "a".repeat(61); // 65 chars
        expect(() => storage.validateJobId(overlyLongId)).toThrow(InvalidJobIdError);
      });

      it("rejects job IDs without job_ prefix", () => {
        expect(() => storage.validateJobId("task_1234567890")).toThrow(InvalidJobIdError);
        expect(() => storage.validateJobId("12345678901234")).toThrow(InvalidJobIdError);
      });

      it("rejects job IDs with path traversal attempts", () => {
        expect(() => storage.validateJobId("job_../etc1234")).toThrow(StoragePathTraversalError);
        expect(() => storage.validateJobId("job_..\\etc1234")).toThrow(StoragePathTraversalError);
        expect(() => storage.validateJobId("job_foo/bar123")).toThrow(StoragePathTraversalError);
        expect(() => storage.validateJobId("job_foo\\bar123")).toThrow(StoragePathTraversalError);
        expect(() => storage.validateJobId("job_foo\0bar123")).toThrow(StoragePathTraversalError);
      });

      it("rejects job IDs with Windows drive letter syntax", () => {
        expect(() => storage.validateJobId("C:\\job_123456")).toThrow(StoragePathTraversalError);
      });
    });

    describe("Filename validation", () => {
      it("rejects filenames with relative path traversal", () => {
        expect(() => storage.validateFilename("../secret.txt")).toThrow(StoragePathTraversalError);
        expect(() => storage.validateFilename("..\\secret.txt")).toThrow(StoragePathTraversalError);
        expect(() => storage.validateFilename("sub/file.txt")).toThrow(StoragePathTraversalError);
        expect(() => storage.validateFilename("sub\\file.txt")).toThrow(StoragePathTraversalError);
      });

      it("rejects filenames with absolute paths", () => {
        expect(() => storage.validateFilename("C:\\Windows\\System32\\cmd.exe")).toThrow(
          StoragePathTraversalError
        );
        expect(() => storage.validateFilename("D:/evil.sh")).toThrow(StoragePathTraversalError);
        expect(() => storage.validateFilename("/etc/passwd")).toThrow(StoragePathTraversalError);
        expect(() => storage.validateFilename("\\Windows\\System32")).toThrow(StoragePathTraversalError);
      });

      it("rejects filenames containing null bytes", () => {
        expect(() => storage.validateFilename("output.srt\0.exe")).toThrow(StoragePathTraversalError);
      });

      it("rejects filenames with Windows reserved characters", () => {
        expect(() => storage.validateFilename("file:stream.txt")).toThrow(InvalidFilenameError);
        expect(() => storage.validateFilename("file*.txt")).toThrow(InvalidFilenameError);
        expect(() => storage.validateFilename("file?.txt")).toThrow(InvalidFilenameError);
        expect(() => storage.validateFilename('file"name.txt')).toThrow(InvalidFilenameError);
        expect(() => storage.validateFilename("file<name.txt")).toThrow(InvalidFilenameError);
        expect(() => storage.validateFilename("file>name.txt")).toThrow(InvalidFilenameError);
        expect(() => storage.validateFilename("file|name.txt")).toThrow(InvalidFilenameError);
      });

      it("rejects dot or whitespace filenames", () => {
        expect(() => storage.validateFilename(".")).toThrow(InvalidFilenameError);
        expect(() => storage.validateFilename("  ")).toThrow(InvalidFilenameError);
        expect(() => storage.validateFilename(" test.txt ")).toThrow(InvalidFilenameError);
      });
    });

    describe("Boundary containment and prefix collision prevention", () => {
      it("prevents sibling job directory prefix collisions", async () => {
        // job_prefixA vs job_prefixAB
        const baseId = "job_1111111111";
        const siblingId = "job_111111111122";

        const baseDir = await storage.getResolvedJobDirectory(baseId);
        const siblingDir = await storage.getResolvedJobDirectory(siblingId);

        expect(baseDir).not.toBe(siblingDir);
        // Ensure path separator prevents treating sibling as child
        expect(siblingDir.startsWith(baseDir + path.sep)).toBe(false);
      });

      it("prevents escaping workspace via filename resolution", async () => {
        await expect(
          storage.getResolvedFilePath(validJobId, "../../../secret.txt")
        ).rejects.toThrow(StoragePathTraversalError);
      });
    });
  });
});
