export type TimingSource = "whisperx" | "faster_whisper" | "estimated" | "unknown";
export type AlignmentStatus = "aligned" | "estimated" | "unaligned";

/**
 * Timing must be paired: either both start and end timestamps are present,
 * or both are null (for unaligned tokens).
 */
export type WordTiming =
  | { start: number; end: number }
  | { start: null; end: null };

export type CanonicalWord = {
  id: string; // prefix: word_
  textRaw: string;
  textNormalized: string;
  asrProbability: number | null;
  timingSource: TimingSource;
  alignmentStatus: AlignmentStatus;
  sourceSegmentId: number | null;
} & WordTiming;
