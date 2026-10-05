import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { jobRepository } from "../../src/modules/jobs/jobs.repository";
import { jobsService } from "../../src/modules/jobs/jobs.service";
import { artifactRepository } from "../../src/modules/artifacts/artifacts.repository";
import { InvalidJobTransitionError } from "../../src/modules/jobs/jobs.transitions";
import { closeDbConnection } from "../../src/database/client/db";
import { closeRedisConnection } from "../../src/database/client/redis";

describe("JobRepository and JobsService Integration", () => {
  const testJobId = `job_test_${Date.now()}`;
  const testArtifactId = `artifact_test_${Date.now()}`;

  afterAll(async () => {
    // Cleanup
    await jobRepository.deleteJob(testJobId).catch(() => {});
  });

  it("creates a new job with default queued status and timestamp", async () => {
    const job = await jobsService.createJob({
      id: testJobId,
      sourceFilename: "sample_audio.mp4",
      sourceMediaReference: "data/jobs/sample_audio.mp4",
    });

    expect(job).toBeDefined();
    expect(job.id).toBe(testJobId);
    expect(job.status).toBe("queued");
    expect(job.sourceFilename).toBe("sample_audio.mp4");
    expect(job.sourceMediaReference).toBe("data/jobs/sample_audio.mp4");
    expect(job.createdAt).toBeInstanceOf(Date);
    expect(job.updatedAt).toBeInstanceOf(Date);
    expect(job.completedAt).toBeNull();
  });

  it("retrieves an existing job by ID", async () => {
    const job = await jobRepository.getJobById(testJobId);
    expect(job).not.toBeNull();
    expect(job?.id).toBe(testJobId);
    expect(job?.status).toBe("queued");
  });

  it("rejects an invalid state transition from queued to completed", async () => {
    expect(async () => {
      await jobsService.transitionJobStatus(testJobId, "completed");
    }).toThrow(InvalidJobTransitionError);
  });

  it("transitions sequentially from queued to validating_media and extracting_audio", async () => {
    const s1 = await jobsService.transitionJobStatus(testJobId, "validating_media");
    expect(s1.status).toBe("validating_media");

    const s2 = await jobsService.transitionJobStatus(testJobId, "extracting_audio");
    expect(s2.status).toBe("extracting_audio");
  });

  it("attaches artifacts to a job and retrieves them", async () => {
    const artifact = await artifactRepository.createArtifact({
      id: testArtifactId,
      jobId: testJobId,
      type: "srt",
      filename: "subtitles.srt",
      createdAt: new Date(),
    });

    expect(artifact.id).toBe(testArtifactId);
    expect(artifact.jobId).toBe(testJobId);
    expect(artifact.type).toBe("srt");

    const jobArtifacts = await artifactRepository.getArtifactsByJobId(testJobId);
    expect(jobArtifacts.length).toBeGreaterThanOrEqual(1);
    expect(jobArtifacts.some((a) => a.id === testArtifactId)).toBe(true);
  });

  it("transitions to failed with structured error code and message", async () => {
    const failedJob = await jobsService.transitionJobStatus(testJobId, "failed", {
      errorCode: "AUDIO_EXTRACTION_FAILED",
      errorMessage: "Corrupt audio stream",
    });

    expect(failedJob.status).toBe("failed");
    expect(failedJob.errorCode).toBe("AUDIO_EXTRACTION_FAILED");
    expect(failedJob.errorMessage).toBe("Corrupt audio stream");
  });

  it("cascades artifact deletion when job is deleted", async () => {
    const deleted = await jobRepository.deleteJob(testJobId);
    expect(deleted).toBe(true);

    const artifact = await artifactRepository.getArtifactById(testArtifactId);
    expect(artifact).toBeNull();
  });
});
