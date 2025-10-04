import { query, queryOne } from "./pool.js";

export interface DbSession {
  id: string;
  courseId: string;
  date: Date;
  createdAt: Date;
}

export interface SessionWithCourse extends DbSession {
  course: {
    id: string;
    code: string;
    name: string;
    startDate: Date;
    endDate: Date;
    providerId: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export async function listSessionsForInstructor(userId: string): Promise<SessionWithCourse[]> {
  const rows = await query<{
    session_id: string;
    session_courseId: string;
    session_date: Date;
    session_createdAt: Date;
    course_id: string;
    course_code: string;
    course_name: string;
    course_startDate: Date;
    course_endDate: Date;
    course_providerId: string;
    course_createdAt: Date;
    course_updatedAt: Date;
  }>(
    'SELECT s.id AS session_id, s.course_id AS "session_courseId", s.date AS session_date, s.created_at AS "session_createdAt", ' +
      'c.id AS course_id, c.code AS course_code, c.name AS course_name, c.start_date AS "course_startDate", c.end_date AS "course_endDate", c.provider_id AS "course_providerId", c.created_at AS "course_createdAt", c.updated_at AS "course_updatedAt" ' +
      'FROM session s JOIN course c ON c.id = s.course_id ' +
      'WHERE EXISTS (SELECT 1 FROM course_instructor ci WHERE ci.course_id = c.id AND ci.user_id = $1)',
    [userId]
  );

  return rows.map((row) => ({
    id: row.session_id,
    courseId: row.session_courseId,
    date: row.session_date,
    createdAt: row.session_createdAt,
    course: {
      id: row.course_id,
      code: row.course_code,
      name: row.course_name,
      startDate: row.course_startDate,
      endDate: row.course_endDate,
      providerId: row.course_providerId,
      createdAt: row.course_createdAt,
      updatedAt: row.course_updatedAt
    }
  }));
}

export async function createSession(data: { courseId: string; date: Date }): Promise<DbSession> {
  const row = await queryOne<DbSession>(
    'INSERT INTO session (course_id, date) VALUES ($1, $2) RETURNING id, course_id AS "courseId", date, created_at AS "createdAt"',
    [data.courseId, data.date]
  );

  if (!row) throw new Error("Failed to create session");
  return row;
}
