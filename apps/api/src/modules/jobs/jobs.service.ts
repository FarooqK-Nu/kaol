import crypto from "node:crypto";
import type { Readable } from "node:stream";
import type { JobStatus } from "@kaol/shared-types";
import { jobRepository, type JobRepository } from "./jobs.repository";
import { isValidJobTransition, InvalidJobTransitionError } from "./jobs.transitions";
import type { JobSelectModel } from "../../database/schema/jobs";
import { LocalStorageService, type StorageService } from "../../storage";

export interface CreateJobInput {
  id?: string;
  sourceFilename?: string;
  sourceMediaReference?: string;
}

export interface CreateJobFromStreamInput {
  originalFilename: string;
  extension: string;
  stream: Readable;
  done?: Promise<void>;
}

export interface TransitionOptions {
  resultReference?: string;
  errorCode?: string;
  errorMessage?: string;
}

export class JobsService {
  constructor(
    private readonly repo: JobRepository = jobRepository,
    private readonly storage: StorageService = new LocalStorageService()
  ) {}

  generateJobId(): string {
    return `job_${crypto.randomUUID().replace(/-/g, "")}`;
  }

  async createJob(input: CreateJobInput = {}): Promise<JobSelectModel> {
    const id = input.id || this.generateJobId();
    return this.repo.createJob({
      id,
      status: "queued",
      sourceFilename: input.sourceFilename,
      sourceMediaReference: input.sourceMediaReference,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async createJobFromStream(input: CreateJobFromStreamInput): Promise<JobSelectModel> {
    const id = this.generateJobId();
    const filename = `input${input.extension}`;

    await this.storage.createJobWorkspace(id);

    try {
      await this.storage.saveStream(id, filename, input.stream);
      if (input.done) {
        await input.done;
      }
    } catch (err) {
      await this.storage.cleanupJob(id).catch(() => {});
      throw err;
    }

    const sourceMediaReference = this.storage.getStorageReference(id, filename);

    try {
      return await this.repo.createJob({
        id,
        status: "queued",
        sourceFilename: input.originalFilename,
        sourceMediaReference,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (err) {
      await this.storage.cleanupJob(id).catch(() => {});
      throw err;
    }
  }

  async getJobById(id: string): Promise<JobSelectModel | null> {
    return this.repo.getJobById(id);
  }

  async transitionJobStatus(
    id: string,
    targetStatus: JobStatus,
    options: TransitionOptions = {}
  ): Promise<JobSelectModel> {
    const currentJob = await this.repo.getJobById(id);
    if (!currentJob) {
      throw new Error(`Job not found: ${id}`);
    }

    if (!isValidJobTransition(currentJob.status, targetStatus)) {
      throw new InvalidJobTransitionError(currentJob.status, targetStatus);
    }

    const updates: Parameters<JobRepository["updateJob"]>[1] = {
      status: targetStatus,
      updatedAt: new Date(),
    };

    if (targetStatus === "completed") {
      updates.completedAt = new Date();
      if (options.resultReference) {
        updates.resultReference = options.resultReference;
      }
    } else if (targetStatus === "failed") {
      updates.errorCode = options.errorCode || "JOB_FAILED";
      updates.errorMessage = options.errorMessage || "Processing failed";
    }

    const updatedJob = await this.repo.updateJob(id, updates);
    if (!updatedJob) {
      throw new Error(`Failed to update job: ${id}`);
    }

    return updatedJob;
  }
}

export const jobsService = new JobsService();
