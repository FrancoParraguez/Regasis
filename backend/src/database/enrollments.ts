import { queryOne } from "./pool.js";

export interface DbEnrollment {
  id: string;
  participantId: string;
  courseId: string;
  createdAt: Date;
}

export async function findEnrollment(participantId: string, courseId: string): Promise<DbEnrollment | null> {
  return queryOne<DbEnrollment>(
    'SELECT id, participant_id AS "participantId", course_id AS "courseId", created_at AS "createdAt" FROM enrollment WHERE participant_id = $1 AND course_id = $2',
    [participantId, courseId]
  );
}

export async function upsertEnrollment(data: {
  participantId: string;
  courseId: string;
}): Promise<DbEnrollment> {
  const inserted = await queryOne<DbEnrollment>(
    'INSERT INTO enrollment (participant_id, course_id) VALUES ($1,$2) ' +
      'ON CONFLICT (participant_id, course_id) DO NOTHING RETURNING id, participant_id AS "participantId", course_id AS "courseId", created_at AS "createdAt"',
    [data.participantId, data.courseId]
  );

  if (inserted) return inserted;

  const existing = await findEnrollment(data.participantId, data.courseId);
  if (!existing) throw new Error("Failed to upsert enrollment");
  return existing;
}
