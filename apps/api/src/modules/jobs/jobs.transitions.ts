import type { JobStatus } from "@kaol/shared-types";

/**
 * Canonical state machine transition graph.
 * Processing flows linearly through the 10 stages towards 'completed'.
 * Any non-terminal state may transition to 'failed'.
 * Terminal states ('completed', 'failed') have no forward transitions.
 */
export const ALLOWED_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  queued: ["validating_media", "failed"],
  validating_media: ["extracting_audio", "failed"],
  extracting_audio: ["transcribing", "failed"],
  transcribing: ["aligning", "failed"],
  aligning: ["normalizing", "failed"],
  normalizing: ["segmenting", "failed"],
  segmenting: ["translating", "failed"],
  translating: ["exporting", "failed"],
  exporting: ["completed", "failed"],
  completed: [],
  failed: [],
};

export function isValidJobTransition(current: JobStatus, target: JobStatus): boolean {
  const nextStates = ALLOWED_TRANSITIONS[current];
  if (!nextStates) return false;
  return nextStates.includes(target);
}

export class InvalidJobTransitionError extends Error {
  public readonly code = "INVALID_STATE_TRANSITION";
  constructor(public readonly current: JobStatus, public readonly target: JobStatus) {
    super(`Cannot transition job status from '${current}' to '${target}'.`);
    this.name = "InvalidJobTransitionError";
  }
}
