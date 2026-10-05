import crypto from "node:crypto";
import type { JobStatus } from "@kaol/shared-types";
import { jobRepository, type JobRepository } from "./jobs.repository";
import { isValidJobTransition, InvalidJobTransitionError } from "./jobs.transitions";
import type { JobSelectModel } from "../../database/schema/jobs";

export interface CreateJobInput {
  id?: string;
  sourceFilename?: string;
  sourceMediaReference?: string;
}

export interface TransitionOptions {
  resultReference?: string;
  errorCode?: string;
  errorMessage?: string;
}

export class JobsService {
  constructor(private readonly repo: JobRepository = jobRepository) {}

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
