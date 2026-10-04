import type { JobStatus } from "./jobs";

/**
 * Public error response returned over client APIs.
 * Intentionally minimal and sanitised with no internal details or stack traces.
 */
export interface PublicError {
  code: string;
  message: string;
}

/**
 * Internal error model used within processing pipelines, workers, and telemetry.
 */
export interface JobError {
  code: string;
  message: string;
  stage: JobStatus;
  retryable: boolean;
  details?: Record<string, unknown> | null;
}
