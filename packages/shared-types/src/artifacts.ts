export type ArtifactType = "srt" | "vtt" | "audio" | "words" | "segments" | "translations";

/**
 * Public artifact metadata describing downloadable or persisted outputs.
 * Never exposes raw internal server filesystem paths.
 */
export interface Artifact {
  id: string; // prefix: artifact_
  type: ArtifactType;
  filename: string;
  jobId: string; // prefix: job_
  createdAt?: string;
}
