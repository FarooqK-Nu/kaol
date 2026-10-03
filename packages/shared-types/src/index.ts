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

export interface PublicError {
  code: string;
  message: string;
}

export interface JobResponse {
  jobId: string;
  status: JobStatus;
  progress?: {
    stage: JobStatus;
  };
  error?: PublicError | null;
}
