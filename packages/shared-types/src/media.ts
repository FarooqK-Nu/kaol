/**
 * Metadata extracted from probing media files via ffprobe.
 */
export interface MediaMetadata {
  durationSeconds: number;
  container: string;
  audioCodec: string;
  sampleRate: number;
  channels: number;
}
