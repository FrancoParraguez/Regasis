import { queryOne } from "./pool.js";

export interface DbEnrollment {
  id: string;
  participantId: string;
  courseId: string;
  role: string | null;
  importJobId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function findEnrollment(participantId: string, courseId: string): Promise<DbEnrollment | null> {
  return queryOne<DbEnrollment>(
    'SELECT "id", "participantId", "courseId", "role", "importJobId", "createdAt", "updatedAt" FROM "Enrollment" WHERE "participantId" = $1 AND "courseId" = $2',
    [participantId, courseId]
  );
}

export async function upsertEnrollment(data: {
  participantId: string;
  courseId: string;
  role?: string | null;
  importJobId?: string | null;
}): Promise<DbEnrollment> {
  const row = await queryOne<DbEnrollment>(
    'INSERT INTO "Enrollment" ("participantId", "courseId", "role", "importJobId") VALUES ($1,$2,$3,$4) ' +
      'ON CONFLICT ("participantId", "courseId") DO UPDATE SET "role" = EXCLUDED."role", "importJobId" = EXCLUDED."importJobId", "updatedAt" = CURRENT_TIMESTAMP RETURNING *',
    [data.participantId, data.courseId, data.role ?? null, data.importJobId ?? null]
  );

  if (!row) throw new Error("Failed to upsert enrollment");
  return row;
}
