import type { Request, Response, NextFunction } from "express";
import { jobsService } from "./jobs.service";
import { parseMultipartUpload, UploadError } from "../../middleware/upload.middleware";

export async function createJobHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const upload = await parseMultipartUpload(req);
    const job = await jobsService.createJobFromStream({
      originalFilename: upload.originalFilename,
      extension: upload.extension,
      stream: upload.stream,
      done: upload.done,
    });
    // console.log(`job queued: ${JSON.stringify(job)}`);

    res.status(201).json({
      jobId: job.id,
      status: job.status,
    });
  } catch (err: unknown) {
    if (err instanceof UploadError) {
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
      return;
    }

    // Generic safe error masking internal implementation details
    res.status(500).json({
      error: {
        code: "JOB_CREATION_FAILED",
        message: "Failed to create processing job.",
      },
    });
  }
}
