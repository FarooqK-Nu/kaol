import type { PublicError } from "./errors";

/**
 * The 10 canonical non-terminal processing states, plus terminal states completed and failed.
 */
export type JobStatus =
  | "queued"
  | "validating_media"
  | "extracting_audio"
  | "transcribing"
  | "aligning"
  | "normalizing"
  | "segmenting"
  | "translating"
  | "exporting"
  | "completed"
  | "failed";

export interface JobProgress {
  stage: JobStatus;
}

/**
 * Public response returned by GET /api/jobs/:jobId
 */
export interface JobResponse {
  jobId: string; // prefix: job_
  status: JobStatus;
  progress?: JobProgress;
  error?: PublicError | null;
}
