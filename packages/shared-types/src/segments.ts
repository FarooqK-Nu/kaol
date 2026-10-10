export type TimingQuality = "aligned" | "estimated" | "fallback";

/**
 * Pre-translation subtitle segment formed by grouping words.
 */
export interface SubtitleSegment {
  id: string; // prefix: seg_
  sequence: number;
  start: number;
  end: number;
  duration: number;
  arabic: string;
  wordIds: string[];
  timingQuality: TimingQuality;
  averageAsrProbability?: number | null;
}

/**
 * Segment with translated English text merged onto the authoritative original timing.
 */
export interface TranslatedSegment {
  id: string; // prefix: seg_
  sequence: number;
  start: number;
  end: number;
  duration?: number;
  arabic: string;
  english: string;
  wordIds: string[];
  timingQuality?: TimingQuality;
}
