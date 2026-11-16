import { eq, desc } from "drizzle-orm";
import { db } from "../../database/client/db";
import { jobs, type JobSelectModel, type JobInsertModel } from "../../database/schema/jobs";

export class JobRepository {
  async createJob(data: JobInsertModel): Promise<JobSelectModel> {
    const [job] = await db.insert(jobs).values(data).returning();
    return job;
  }

  async getJobById(id: string): Promise<JobSelectModel | null> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || null;
  }

  async updateJob(id: string, updates: Partial<JobInsertModel>): Promise<JobSelectModel | null> {
    const [updated] = await db
      .update(jobs)
      .set(updates)
      .where(eq(jobs.id, id))
      .returning();
    return updated || null;
  }

  async listJobs(limit = 50, offset = 0): Promise<JobSelectModel[]> {
    return db
      .select()
      .from(jobs)
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async deleteJob(id: string): Promise<boolean> {
    const deleted = await db.delete(jobs).where(eq(jobs.id, id)).returning({ id: jobs.id });
    return deleted.length > 0;
  }
}

export const jobRepository = new JobRepository();
