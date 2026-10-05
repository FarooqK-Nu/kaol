import { describe, expect, test } from "bun:test";
import type {
  Artifact,
  ArtifactType,
  CanonicalWord,
  JobError,
  JobResponse,
  JobStatus,
  MediaMetadata,
  PublicError,
  SubtitleSegment,
  TimingQuality,
  TimingSource,
  AlignmentStatus,
  TranscriptionResult,
  TranslatedSegment,
  TranslationInput,
  TranslationOutput,
  TranslationResult,
} from "../src";

import alignedWordJson from "../fixtures/canonical-word-aligned.json";
import unalignedWordJson from "../fixtures/canonical-word-unaligned.json";
import subtitleSegmentJson from "../fixtures/subtitle-segment.json";
import translatedSegmentJson from "../fixtures/translated-segment.json";
import translationInputJson from "../fixtures/translation-input.json";
import translationOutputJson from "../fixtures/translation-output.json";
import translationResultJson from "../fixtures/translation-result.json";
import transcriptionResultJson from "../fixtures/transcription-result.json";
import mediaMetadataJson from "../fixtures/media-metadata.json";
import publicErrorJson from "../fixtures/public-error.json";
import jobErrorJson from "../fixtures/job-error.json";
import jobResponseJson from "../fixtures/job-response.json";
import artifactJson from "../fixtures/artifact.json";

describe("Shared Contracts Compile-time Conformance", () => {
  test("CanonicalWord correctly types paired and unaligned timing", () => {
    const aligned: CanonicalWord = {
      ...alignedWordJson,
      timingSource: alignedWordJson.timingSource as TimingSource,
      alignmentStatus: alignedWordJson.alignmentStatus as AlignmentStatus,
    };
    expect(aligned.start).toBe(4.18);
    expect(aligned.end).toBe(4.71);

    const unaligned: CanonicalWord = {
      ...unalignedWordJson,
      start: null,
      end: null,
      timingSource: unalignedWordJson.timingSource as TimingSource,
      alignmentStatus: unalignedWordJson.alignmentStatus as AlignmentStatus,
    };
    expect(unaligned.start).toBeNull();
    expect(unaligned.end).toBeNull();
  });

  test("Compile-time type assertions verify schema constraints", () => {
    // Negative test 1: Unpaired timing (start present, end null) must be rejected
    // @ts-expect-error - Must reject start without end
    const _invalidUnpairedStart: CanonicalWord = {
      id: "word_000001",
      textRaw: "test",
      textNormalized: "test",
      start: 1.0,
      end: null,
      asrProbability: 0.9,
      timingSource: "whisperx",
      alignmentStatus: "aligned",
      sourceSegmentId: 0,
    };

    // Negative test 2: Unpaired timing (start null, end present) must be rejected
    // @ts-expect-error - Must reject end without start
    const _invalidUnpairedEnd: CanonicalWord = {
      id: "word_000001",
      textRaw: "test",
      textNormalized: "test",
      start: null,
      end: 2.0,
      asrProbability: 0.9,
      timingSource: "whisperx",
      alignmentStatus: "aligned",
      sourceSegmentId: 0,
    };

    // Negative test 3: TranslationInput must not accept extraneous context fields
    const _invalidInput: TranslationInput = {
      id: "seg_000001",
      arabic: "test",
      // @ts-expect-error - TranslationInput has no contextBefore
      contextBefore: ["prior text"],
    };


    void [_invalidUnpairedStart, _invalidUnpairedEnd, _invalidInput];
  });

  test("All JSON fixtures map cleanly to TypeScript contract types", () => {
    const segment: SubtitleSegment = {
      ...subtitleSegmentJson,
      timingQuality: subtitleSegmentJson.timingQuality as TimingQuality,
    };
    expect(segment.id).toBe("seg_000001");

    const translatedSegment: TranslatedSegment = {
      ...translatedSegmentJson,
      timingQuality: translatedSegmentJson.timingQuality as TimingQuality,
    };
    expect(translatedSegment.english).toBe("Peace be upon you.");

    const translationInput: TranslationInput = translationInputJson;
    expect(translationInput.arabic).toBe("السلام عليكم ورحمة الله وبركاته");

    const translationOutput: TranslationOutput = translationOutputJson;
    expect(translationOutput.english).toBe("Peace be upon you.");

    const translationResult: TranslationResult = {
      ...translationResultJson,
      segments: translationResultJson.segments.map((s) => ({
        ...s,
        timingQuality: s.timingQuality as TimingQuality,
      })),
    };
    expect(translationResult.translation.provider).toBe("opus");

    const transcriptionResult: TranscriptionResult = {
      ...transcriptionResultJson,
      schemaVersion: transcriptionResultJson.schemaVersion as "1.0",
      language: transcriptionResultJson.language as "ar",
      segments: transcriptionResultJson.segments.map((s) => ({
        ...s,
        timingQuality: s.timingQuality as TimingQuality,
      })),
      words: transcriptionResultJson.words.map((w) => ({
        ...w,
        timingSource: w.timingSource as TimingSource,
        alignmentStatus: w.alignmentStatus as AlignmentStatus,
      })),
    };
    expect(transcriptionResult.schemaVersion).toBe("1.0");

    const mediaMetadata: MediaMetadata = mediaMetadataJson;
    expect(mediaMetadata.durationSeconds).toBe(154.82);

    const publicError: PublicError = publicErrorJson;
    expect(publicError.code).toBe("TRANSCRIPTION_FAILED");

    const jobError: JobError = {
      ...jobErrorJson,
      stage: jobErrorJson.stage as JobStatus,
    };
    expect(jobError.retryable).toBe(true);

    const jobResponse: JobResponse = {
      ...jobResponseJson,
      status: jobResponseJson.status as JobStatus,
      progress: {
        stage: jobResponseJson.progress.stage as JobStatus,
      },
    };
    expect(jobResponse.jobId).toBe("job_123");

    const artifact: Artifact = {
      ...artifactJson,
      type: artifactJson.type as ArtifactType,
    };
    expect(artifact.type).toBe("srt");
  });
});
