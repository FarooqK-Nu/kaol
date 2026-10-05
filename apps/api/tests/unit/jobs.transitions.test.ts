import { describe, expect, it } from "bun:test";
import {
  isValidJobTransition,
  InvalidJobTransitionError,
} from "../../src/modules/jobs/jobs.transitions";

describe("Job State Machine Transitions", () => {
  it("allows all valid sequential state transitions", () => {
    expect(isValidJobTransition("queued", "validating_media")).toBe(true);
    expect(isValidJobTransition("validating_media", "extracting_audio")).toBe(true);
    expect(isValidJobTransition("extracting_audio", "transcribing")).toBe(true);
    expect(isValidJobTransition("transcribing", "aligning")).toBe(true);
    expect(isValidJobTransition("aligning", "normalizing")).toBe(true);
    expect(isValidJobTransition("normalizing", "segmenting")).toBe(true);
    expect(isValidJobTransition("segmenting", "translating")).toBe(true);
    expect(isValidJobTransition("translating", "exporting")).toBe(true);
    expect(isValidJobTransition("exporting", "completed")).toBe(true);
  });

  it("allows transitions to failed from any non-terminal state", () => {
    expect(isValidJobTransition("queued", "failed")).toBe(true);
    expect(isValidJobTransition("validating_media", "failed")).toBe(true);
    expect(isValidJobTransition("extracting_audio", "failed")).toBe(true);
    expect(isValidJobTransition("transcribing", "failed")).toBe(true);
    expect(isValidJobTransition("aligning", "failed")).toBe(true);
    expect(isValidJobTransition("normalizing", "failed")).toBe(true);
    expect(isValidJobTransition("segmenting", "failed")).toBe(true);
    expect(isValidJobTransition("translating", "failed")).toBe(true);
    expect(isValidJobTransition("exporting", "failed")).toBe(true);
  });

  it("rejects illegal skips, backward transitions, and transitions from terminal states", () => {
    // Skipping stages
    expect(isValidJobTransition("queued", "completed")).toBe(false);
    expect(isValidJobTransition("queued", "transcribing")).toBe(false);
    expect(isValidJobTransition("transcribing", "completed")).toBe(false);

    // Backward transitions
    expect(isValidJobTransition("translating", "transcribing")).toBe(false);
    expect(isValidJobTransition("validating_media", "queued")).toBe(false);

    // Terminal states cannot transition
    expect(isValidJobTransition("completed", "queued")).toBe(false);
    expect(isValidJobTransition("completed", "failed")).toBe(false);
    expect(isValidJobTransition("failed", "queued")).toBe(false);
    expect(isValidJobTransition("failed", "completed")).toBe(false);
  });

  it("constructs InvalidJobTransitionError with proper message and code", () => {
    const error = new InvalidJobTransitionError("queued", "completed");
    expect(error.code).toBe("INVALID_STATE_TRANSITION");
    expect(error.message).toContain("Cannot transition job status from 'queued' to 'completed'");
  });
});
