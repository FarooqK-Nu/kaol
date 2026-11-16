import fs from "node:fs";
import { promises as fsPromises } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pipeline, Readable } from "node:stream";
import { promisify } from "node:util";
import { getResolvedStorageRoot } from "../config/env";
import type { StorageService } from "./storage.interface";
import {
  StoragePathTraversalError,
  StorageFileNotFoundError,
  InvalidJobIdError,
  InvalidFilenameError,
} from "./storage.errors";

const streamPipeline = promisify(pipeline);

const JOB_ID_REGEX = /^job_[a-zA-Z0-9_-]+$/;
const MIN_JOB_ID_LENGTH = 10;
const MAX_JOB_ID_LENGTH = 64;

export class LocalStorageService implements StorageService {
  private storageRoot: string | null = null;
  private readonly customStorageRoot?: string;

  constructor(customStorageRoot?: string) {
    if (customStorageRoot) {
      this.storageRoot = path.resolve(customStorageRoot);
      this.customStorageRoot = customStorageRoot;
    }
  }

  /**
   * Asynchronously resolves and returns the configured storage root.
   */
  public async getStorageRoot(): Promise<string> {
    if (!this.storageRoot) {
      this.storageRoot = await getResolvedStorageRoot(this.customStorageRoot);
    }
    return this.storageRoot;
  }

  /**
   * Validates that the given job ID is syntactically sound, within length limits,
   * and does not attempt any directory traversal.
   */
  public validateJobId(jobId: string): void {
    if (!jobId || typeof jobId !== "string") {
      throw new InvalidJobIdError("Job ID must be a non-empty string");
    }

    if (jobId.length < MIN_JOB_ID_LENGTH || jobId.length > MAX_JOB_ID_LENGTH) {
      throw new InvalidJobIdError(
        `Job ID length must be between ${MIN_JOB_ID_LENGTH} and ${MAX_JOB_ID_LENGTH} characters (received: ${jobId.length})`
      );
    }

    if (jobId.includes("..") || jobId.includes("/") || jobId.includes("\\") || jobId.includes("\0")) {
      throw new StoragePathTraversalError("Job ID contains illegal traversal characters");
    }

    if (!JOB_ID_REGEX.test(jobId)) {
      throw new InvalidJobIdError(
        `Job ID "${jobId}" does not match required pattern "^job_[a-zA-Z0-9_-]+$"`
      );
    }
  }

  /**
   * Validates that the filename is a single clean component without separators,
   * traversal markers, or dangerous characters.
   */
  public validateFilename(filename: string): void {
    if (!filename || typeof filename !== "string") {
      throw new InvalidFilenameError("Filename must be a non-empty string");
    }

    if (
      filename.includes("\0") ||
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\") ||
      /^[a-zA-Z]:/.test(filename)
    ) {
      throw new StoragePathTraversalError(`Path traversal attempt in filename: "${filename}"`);
    }

    // Windows illegal filename characters: : * ? " < > |
    if (/[:*?"<>|]/.test(filename) || filename === "." || filename.trim() !== filename) {
      throw new InvalidFilenameError(`Filename contains invalid characters or formatting: "${filename}"`);
    }
  }

  /**
   * Returns the canonical, fully resolved job directory.
   * Enforces that the directory resides strictly within the storage root.
   */
  public async getResolvedJobDirectory(jobId: string): Promise<string> {
    this.validateJobId(jobId);
    const storageRoot = await this.getStorageRoot();
    const resolvedJobDir = path.resolve(storageRoot, jobId);
    const rootPrefix = storageRoot.endsWith(path.sep)
      ? storageRoot
      : storageRoot + path.sep;

    if (!resolvedJobDir.startsWith(rootPrefix)) {
      throw new StoragePathTraversalError(`Job directory escapes storage root: "${jobId}"`);
    }

    return resolvedJobDir;
  }

  /**
   * Returns the canonical, fully resolved file path within a job's workspace.
   * Enforces containment within the specific job directory, preventing prefix collisions (e.g. job_1 vs job_10).
   */
  public async getResolvedFilePath(jobId: string, filename: string): Promise<string> {
    this.validateFilename(filename);
    const jobDir = await this.getResolvedJobDirectory(jobId);

    const resolvedFilePath = path.resolve(jobDir, filename);
    const jobDirPrefix = jobDir.endsWith(path.sep) ? jobDir : jobDir + path.sep;

    if (!resolvedFilePath.startsWith(jobDirPrefix)) {
      throw new StoragePathTraversalError(
        `File path escapes job workspace boundary: "${filename}" in "${jobId}"`
      );
    }

    return resolvedFilePath;
  }

  public async createJobWorkspace(jobId: string): Promise<void> {
    const jobDir = await this.getResolvedJobDirectory(jobId);
    await fsPromises.mkdir(jobDir, { recursive: true });
  }

  public async saveBuffer(
    jobId: string,
    filename: string,
    content: Buffer | Uint8Array
  ): Promise<void> {
    const targetPath = await this.getResolvedFilePath(jobId, filename);
    const jobDir = path.dirname(targetPath);
    await fsPromises.mkdir(jobDir, { recursive: true });

    // Atomic write via dot-prefixed temporary file
    const tempPath = path.join(jobDir, `.${filename}.${crypto.randomUUID()}.tmp`);
    try {
      await fsPromises.writeFile(tempPath, content);
      await fsPromises.rename(tempPath, targetPath);
    } catch (err) {
      await fsPromises.rm(tempPath, { force: true }).catch(() => {});
      throw err;
    }
  }

  public async saveText(jobId: string, filename: string, content: string): Promise<void> {
    const targetPath = await this.getResolvedFilePath(jobId, filename);
    const jobDir = path.dirname(targetPath);
    await fsPromises.mkdir(jobDir, { recursive: true });

    // Atomic write with UTF-8 encoding via dot-prefixed temporary file
    const tempPath = path.join(jobDir, `.${filename}.${crypto.randomUUID()}.tmp`);
    try {
      await fsPromises.writeFile(tempPath, content, { encoding: "utf-8" });
      await fsPromises.rename(tempPath, targetPath);
    } catch (err) {
      await fsPromises.rm(tempPath, { force: true }).catch(() => {});
      throw err;
    }
  }

  public async saveStream(jobId: string, filename: string, stream: Readable): Promise<void> {
    const targetPath = await this.getResolvedFilePath(jobId, filename);
    const jobDir = path.dirname(targetPath);
    await fsPromises.mkdir(jobDir, { recursive: true });

    // Atomic write via dot-prefixed temporary file
    const tempPath = path.join(jobDir, `.${filename}.${crypto.randomUUID()}.tmp`);
    const writeStream = fs.createWriteStream(tempPath);

    try {
      await streamPipeline(stream, writeStream);
      await fsPromises.rename(tempPath, targetPath);
    } catch (err) {
      writeStream.destroy();
      await fsPromises.rm(tempPath, { force: true }).catch(() => {});
      throw err;
    }
  }

  public async getBuffer(jobId: string, filename: string): Promise<Buffer> {
    const targetPath = await this.getResolvedFilePath(jobId, filename);
    try {
      return await fsPromises.readFile(targetPath);
    } catch (err: unknown) {
      if (this.isEnoent(err)) {
        throw new StorageFileNotFoundError(jobId, filename);
      }
      throw err;
    }
  }

  public async getText(jobId: string, filename: string): Promise<string> {
    const targetPath = await this.getResolvedFilePath(jobId, filename);
    try {
      return await fsPromises.readFile(targetPath, { encoding: "utf-8" });
    } catch (err: unknown) {
      if (this.isEnoent(err)) {
        throw new StorageFileNotFoundError(jobId, filename);
      }
      throw err;
    }
  }

  public async getStream(jobId: string, filename: string): Promise<Readable> {
    const targetPath = await this.getResolvedFilePath(jobId, filename);
    try {
      await fsPromises.access(targetPath, fs.constants.R_OK);
      return fs.createReadStream(targetPath);
    } catch (err: unknown) {
      if (this.isEnoent(err)) {
        throw new StorageFileNotFoundError(jobId, filename);
      }
      throw err;
    }
  }

  public async exists(jobId: string, filename: string): Promise<boolean> {
    try {
      const targetPath = await this.getResolvedFilePath(jobId, filename);
      await fsPromises.access(targetPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  public async delete(jobId: string, filename: string): Promise<void> {
    const targetPath = await this.getResolvedFilePath(jobId, filename);
    try {
      await fsPromises.unlink(targetPath);
    } catch (err: unknown) {
      if (this.isEnoent(err)) {
        throw new StorageFileNotFoundError(jobId, filename);
      }
      throw err;
    }
  }

  public async cleanupJob(jobId: string): Promise<void> {
    const jobDir = await this.getResolvedJobDirectory(jobId);
    await fsPromises.rm(jobDir, { recursive: true, force: true });
  }

  private isEnoent(err: unknown): boolean {
    return (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "ENOENT"
    );
  }
}
