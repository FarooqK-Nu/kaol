import type { SubtitleSegment } from "./segments";
import type { CanonicalWord } from "./words";

/**
 * Persisted output of transcription and segmentation stages.
 * Segments serve as the translation handoff, while words provide timing and audit traceability.
 */
export interface TranscriptionResult {
  schemaVersion: "1.0";
  language: "ar";
  durationSeconds: number;
  segments: SubtitleSegment[];
  words: CanonicalWord[];
}
