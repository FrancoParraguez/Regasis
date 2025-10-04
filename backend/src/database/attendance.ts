import type { AttendanceState } from "../types/attendance.js";
import { query, queryOne, type DatabaseClient } from "./pool.js";

interface EnrollmentRow {
  id: string;
  participantId: string;
  courseId: string;
  createdAt: Date;
}

interface ParticipantRow {
  id: string;
  email: string;
  name: string;
  providerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CourseRow {
  id: string;
  code: string;
  name: string;
  startDate: Date;
  endDate: Date;
  providerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbAttendance {
  id: string;
  sessionId: string;
  enrollmentId: string;
  state: AttendanceState;
  observation: string | null;
  updatedById: string | null;
  updatedAt: Date;
  createdAt: Date;
  enrollment: EnrollmentRow & {
    participant: ParticipantRow;
    course: CourseRow;
  };
}

export async function findAttendanceBySession(sessionId: string): Promise<DbAttendance[]> {
  const rows = await query<{
    attendance_id: string;
    attendance_sessionId: string;
    attendance_enrollmentId: string;
    attendance_state: AttendanceState;
    attendance_observation: string | null;
    attendance_updatedById: string | null;
    attendance_updatedAt: Date;
    attendance_createdAt: Date;
    enrollment_id: string;
    enrollment_participantId: string;
    enrollment_courseId: string;
    enrollment_createdAt: Date;
    participant_id: string;
    participant_email: string;
    participant_name: string;
    participant_providerId: string | null;
    participant_createdAt: Date;
    participant_updatedAt: Date;
    course_id: string;
    course_code: string;
    course_name: string;
    course_startDate: Date;
    course_endDate: Date;
    course_providerId: string;
    course_createdAt: Date;
    course_updatedAt: Date;
  }>(
    'SELECT a.id AS attendance_id, a.session_id AS "attendance_sessionId", a.enrollment_id AS "attendance_enrollmentId", a.state AS attendance_state, a.observation AS attendance_observation, a.updated_by_id AS "attendance_updatedById", a.updated_at AS "attendance_updatedAt", a.created_at AS "attendance_createdAt", ' +
      'e.id AS enrollment_id, e.participant_id AS "enrollment_participantId", e.course_id AS "enrollment_courseId", e.created_at AS "enrollment_createdAt", ' +
      'p.id AS participant_id, p.email AS participant_email, p.name AS participant_name, p.provider_id AS "participant_providerId", p.created_at AS "participant_createdAt", p.updated_at AS "participant_updatedAt", ' +
      'c.id AS course_id, c.code AS course_code, c.name AS course_name, c.start_date AS "course_startDate", c.end_date AS "course_endDate", c.provider_id AS "course_providerId", c.created_at AS "course_createdAt", c.updated_at AS "course_updatedAt" ' +
      'FROM attendance a ' +
      'JOIN enrollment e ON e.id = a.enrollment_id ' +
      'JOIN participant p ON p.id = e.participant_id ' +
      'JOIN course c ON c.id = e.course_id ' +
      'WHERE a.session_id = $1',
    [sessionId]
  );

  return rows.map((row) => ({
    id: row.attendance_id,
    sessionId: row.attendance_sessionId,
    enrollmentId: row.attendance_enrollmentId,
    state: row.attendance_state,
    observation: row.attendance_observation,
    updatedById: row.attendance_updatedById,
    updatedAt: row.attendance_updatedAt,
    createdAt: row.attendance_createdAt,
    enrollment: {
      id: row.enrollment_id,
      participantId: row.enrollment_participantId,
      courseId: row.enrollment_courseId,
      createdAt: row.enrollment_createdAt,
      participant: {
        id: row.participant_id,
        email: row.participant_email,
        name: row.participant_name,
        providerId: row.participant_providerId,
        createdAt: row.participant_createdAt,
        updatedAt: row.participant_updatedAt
      },
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
    }
  }));
}

export interface AttendanceUpsertData {
  sessionId: string;
  enrollmentId: string;
  state: AttendanceState;
  observation?: string;
  updatedById?: string;
}

export async function upsertAttendance(
  data: AttendanceUpsertData,
  client?: DatabaseClient
): Promise<DbAttendance> {
  const update = await queryOne<DbAttendance>(
    'UPDATE attendance SET state = $3, observation = $4, updated_by_id = $5, updated_at = CURRENT_TIMESTAMP ' +
      'WHERE session_id = $1 AND enrollment_id = $2 RETURNING id, session_id AS "sessionId", enrollment_id AS "enrollmentId", state, observation, updated_by_id AS "updatedById", updated_at AS "updatedAt", created_at AS "createdAt"',
    [
      data.sessionId,
      data.enrollmentId,
      data.state,
      data.observation ?? null,
      data.updatedById ?? null
    ],
    client
  );

  if (update) return update;

  const insert = await queryOne<DbAttendance>(
    'INSERT INTO attendance (session_id, enrollment_id, state, observation, updated_by_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, session_id AS "sessionId", enrollment_id AS "enrollmentId", state, observation, updated_by_id AS "updatedById", updated_at AS "updatedAt", created_at AS "createdAt"',
    [
      data.sessionId,
      data.enrollmentId,
      data.state,
      data.observation ?? null,
      data.updatedById ?? null
    ],
    client
  );

  if (!insert) throw new Error("Failed to upsert attendance record");
  return insert;
}
