import type { Readable } from "node:stream";

export interface StorageService {
  /**
   * Initializes an isolated storage workspace for the given job.
   */
  createJobWorkspace(jobId: string): Promise<void>;

  /**
   * Saves small buffer content (e.g. metadata or small artifacts).
   */
  saveBuffer(jobId: string, filename: string, content: Buffer | Uint8Array): Promise<void>;

  /**
   * Saves small text content with UTF-8 encoding (e.g. JSON or SRT).
   */
  saveText(jobId: string, filename: string, content: string): Promise<void>;

  /**
   * Streams large media or audio into storage. Performs an atomic write
   * via a dot-prefixed temporary file and rename.
   */
  saveStream(jobId: string, filename: string, stream: Readable): Promise<void>;

  /**
   * Retrieves small file contents into a memory Buffer.
   */
  getBuffer(jobId: string, filename: string): Promise<Buffer>;

  /**
   * Retrieves small text file contents decoded as a UTF-8 string.
   */
  getText(jobId: string, filename: string): Promise<string>;

  /**
   * Streams large file contents from storage.
   */
  getStream(jobId: string, filename: string): Promise<Readable>;

  /**
   * Checks whether a file exists in the job workspace.
   */
  exists(jobId: string, filename: string): Promise<boolean>;

  /**
   * Deletes a specific file primitive from the job workspace.
   */
  delete(jobId: string, filename: string): Promise<void>;

  /**
   * Deletes the entire job workspace.
   */
  cleanupJob(jobId: string): Promise<void>;
}
