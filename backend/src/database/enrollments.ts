import { queryOne } from "./pool.js";

export interface DbEnrollment {
  id: string;
  participantId: string;
  courseId: string;
  createdAt: Date;
}

export async function findEnrollment(participantId: string, courseId: string): Promise<DbEnrollment | null> {
  return queryOne<DbEnrollment>(
    'SELECT "id", "participantId", "courseId", "createdAt" FROM "Enrollment" WHERE "participantId" = $1 AND "courseId" = $2',
    [participantId, courseId]
  );
}

export async function upsertEnrollment(data: {
  participantId: string;
  courseId: string;
}): Promise<DbEnrollment> {
  const inserted = await queryOne<DbEnrollment>(
    'INSERT INTO "Enrollment" ("participantId", "courseId") VALUES ($1,$2) ' +
      'ON CONFLICT ("participantId", "courseId") DO NOTHING RETURNING "id", "participantId", "courseId", "createdAt"',
    [data.participantId, data.courseId]
  );

  if (inserted) return inserted;

  const existing = await findEnrollment(data.participantId, data.courseId);
  if (!existing) throw new Error("Failed to upsert enrollment");
  return existing;
}
