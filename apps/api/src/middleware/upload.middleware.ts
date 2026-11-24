import path from "node:path";
import { Readable, PassThrough } from "node:stream";
import type { Request } from "express";
import busboy from "busboy";
import { env } from "../config/env";

export const ALLOWED_EXTENSIONS = [".mp4", ".wav", ".mp3", ".m4a", ".mov"] as const;
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export class UploadError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export interface ParsedUploadStream {
  originalFilename: string;
  extension: AllowedExtension;
  stream: Readable;
  done: Promise<void>;
}

/**
 * Parses an incoming multipart/form-data request with Busboy, streaming
 * the uploaded file directly without buffering in memory or on disk.
 */
export function parseMultipartUpload(req: Request): Promise<ParsedUploadStream> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"];
    if (!contentType || !contentType.toLowerCase().startsWith("multipart/form-data")) {
      return reject(
        new UploadError(
          400,
          "INVALID_CONTENT_TYPE",
          "Content-Type must be multipart/form-data."
        )
      );
    }

    const maxBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
    let fileCount = 0;
    let hasResolved = false;
    let isAborted = false;
    let passThroughStream: PassThrough | null = null;

    let doneResolve!: () => void;
    let doneReject!: (err: UploadError) => void;
    const donePromise = new Promise<void>((res, rej) => {
      doneResolve = res;
      doneReject = rej;
    });
    // Prevent unhandled promise rejection if rejected before or without being awaited
    donePromise.catch(() => {});

    let bb: busboy.Busboy;
    try {
      bb = busboy({
        headers: req.headers,
        limits: {
          fileSize: maxBytes,
          files: 1,
        },
      });
    } catch (err: unknown) {
      return reject(
        new UploadError(
          400,
          "MALFORMED_MULTIPART",
          err instanceof Error ? err.message : "Failed to initialize multipart parser."
        )
      );
    }

    let currentFileStream: Readable | null = null;

    const fail = (error: UploadError) => {
      if (isAborted) return;
      isAborted = true;

      // 1. Detach parser from incoming request stream
      req.unpipe(bb);

      // 2. Drain any remaining incoming TCP bytes so the socket stays clean
      // and the HTTP error response can be flushed without ECONNRESET
      req.resume();

      // 3. Drain in-flight file sub-stream
      if (currentFileStream && !currentFileStream.destroyed) {
        currentFileStream.resume();
      }

      // 4. Safely terminate the Busboy parser
      bb.removeAllListeners();
      bb.on("error", () => {}); // Absorb internal 'Unexpected end of form' on destroy
      bb.destroy();

      // 5. Destroy output stream to trigger LocalStorageService rollback
      if (passThroughStream && !passThroughStream.destroyed) {
        passThroughStream.destroy(error);
      }

      if (!hasResolved) {
        hasResolved = true;
        reject(error);
      } else {
        doneReject(error);
      }
    };

    req.on("close", () => {
      if (!req.complete) {
        fail(
          new UploadError(
            400,
            "CLIENT_ABORTED",
            "Client disconnected before upload completed."
          )
        );
      }
    });

    bb.on("filesLimit", () => {
      fail(
        new UploadError(
          400,
          "TOO_MANY_FILES",
          "Only a single media file is permitted."
        )
      );
    });

    bb.on("file", (fieldname, fileStream, info) => {
      // Absorb internal stream errors if fileStream is aborted or destroyed by Busboy
      fileStream.on("error", () => {});

      currentFileStream = fileStream;
      fileStream.on("end", () => {
        if (currentFileStream === fileStream) currentFileStream = null;
      });
      fileStream.on("close", () => {
        if (currentFileStream === fileStream) currentFileStream = null;
      });

      fileCount++;

      if (fileCount > 1) {
        fileStream.resume();
        return fail(
          new UploadError(
            400,
            "TOO_MANY_FILES",
            "Only a single media file is permitted."
          )
        );
      }

      if (fieldname !== "file") {
        fileStream.resume();
        return fail(
          new UploadError(
            400,
            "INVALID_FILE_FIELD",
            `Unexpected upload field "${fieldname}". Expected field name "file".`
          )
        );
      }

      const originalFilename = info.filename;
      if (!originalFilename || originalFilename.trim() === "") {
        fileStream.resume();
        return fail(
          new UploadError(400, "MISSING_FILE", "Uploaded file has no filename.")
        );
      }

      const ext = path.extname(originalFilename).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext as AllowedExtension)) {
        fileStream.resume();
        return fail(
          new UploadError(
            400,
            "UNSUPPORTED_MEDIA_TYPE",
            `Unsupported file extension "${ext}". Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}.`
          )
        );
      }

      passThroughStream = new PassThrough();
      passThroughStream.on("error", () => {});

      fileStream.on("limit", () => {
        fail(
          new UploadError(
            400,
            "PAYLOAD_TOO_LARGE",
            `File exceeds maximum permitted size of ${env.MAX_UPLOAD_SIZE_MB}MB.`
          )
        );
      });

      fileStream.on("error", (err: unknown) => {
        fail(
          new UploadError(
            400,
            "STREAM_ERROR",
            `Error reading file stream: ${err instanceof Error ? err.message : String(err)}`
          )
        );
      });

      fileStream.pipe(passThroughStream);

      hasResolved = true;
      resolve({
        originalFilename,
        extension: ext as AllowedExtension,
        stream: passThroughStream,
        done: donePromise,
      });
    });

    bb.on("error", (err: unknown) => {
      fail(
        new UploadError(
          400,
          "MALFORMED_MULTIPART",
          `Malformed multipart request: ${err instanceof Error ? err.message : String(err)}`
        )
      );
    });

    bb.on("close", () => {
      if (fileCount === 0 && !isAborted) {
        fail(
          new UploadError(
            400,
            "MISSING_FILE",
            "No media file provided in 'file' field."
          )
        );
      } else if (!isAborted) {
        doneResolve();
      }
    });

    req.pipe(bb);
  });
}
