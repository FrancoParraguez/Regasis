import { query, queryOne } from "./pool.js";

export interface DbSession {
  id: string;
  courseId: string;
  date: Date;
}

export interface SessionWithCourse extends DbSession {
  course: {
    id: string;
    code: string;
    name: string;
    startDate: Date;
    endDate: Date;
    providerId: string;
    status: string;
    description: string | null;
    location: string | null;
    modality: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

export async function listSessionsForInstructor(userId: string): Promise<SessionWithCourse[]> {
  const rows = await query<{
    session_id: string;
    session_courseId: string;
    session_date: Date;
    course_id: string;
    course_code: string;
    course_name: string;
    course_startDate: Date;
    course_endDate: Date;
    course_providerId: string;
    course_status: string;
    course_description: string | null;
    course_location: string | null;
    course_modality: string | null;
    course_createdAt: Date;
    course_updatedAt: Date;
  }>(
    'SELECT s."id" AS session_id, s."courseId" AS session_courseId, s."date" AS session_date, ' +
      'c."id" AS course_id, c."code" AS course_code, c."name" AS course_name, c."startDate" AS course_startDate, c."endDate" AS course_endDate, c."providerId" AS course_providerId, c."status" AS course_status, c."description" AS course_description, c."location" AS course_location, c."modality" AS course_modality, c."createdAt" AS course_createdAt, c."updatedAt" AS course_updatedAt ' +
      'FROM "Session" s JOIN "Course" c ON c."id" = s."courseId" ' +
      'WHERE EXISTS (SELECT 1 FROM "CourseInstructor" ci WHERE ci."courseId" = c."id" AND ci."userId" = $1)',
    [userId]
  );

  return rows.map((row) => ({
    id: row.session_id,
    courseId: row.session_courseId,
    date: row.session_date,
    course: {
      id: row.course_id,
      code: row.course_code,
      name: row.course_name,
      startDate: row.course_startDate,
      endDate: row.course_endDate,
      providerId: row.course_providerId,
      status: row.course_status,
      description: row.course_description,
      location: row.course_location,
      modality: row.course_modality,
      createdAt: row.course_createdAt,
      updatedAt: row.course_updatedAt
    }
  }));
}

export async function createSession(data: { courseId: string; date: Date }): Promise<DbSession> {
  const row = await queryOne<DbSession>(
    'INSERT INTO "Session" ("courseId", "date") VALUES ($1, $2) RETURNING *',
    [data.courseId, data.date]
  );

  if (!row) throw new Error("Failed to create session");
  return row;
}
