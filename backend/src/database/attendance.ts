import type { AttendanceState } from "../types/attendance.js";
import { query, queryOne, type DatabaseClient } from "./pool.js";

interface EnrollmentRow {
  id: string;
  participantId: string;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
  role: string | null;
  importJobId: string | null;
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
  status: string;
  description: string | null;
  location: string | null;
  modality: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbAttendance {
  id: string;
  sessionId: string;
  enrollmentId: string;
  state: AttendanceState;
  observation: string | null;
  justification: string | null;
  updatedById: string | null;
  importJobId: string | null;
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
    attendance_justification: string | null;
    attendance_updatedById: string | null;
    attendance_importJobId: string | null;
    attendance_updatedAt: Date;
    attendance_createdAt: Date;
    enrollment_id: string;
    enrollment_participantId: string;
    enrollment_courseId: string;
    enrollment_createdAt: Date;
    enrollment_updatedAt: Date;
    enrollment_role: string | null;
    enrollment_importJobId: string | null;
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
    course_status: string;
    course_description: string | null;
    course_location: string | null;
    course_modality: string | null;
    course_createdAt: Date;
    course_updatedAt: Date;
  }>(
    'SELECT a."id" AS attendance_id, a."sessionId" AS attendance_sessionId, a."enrollmentId" AS attendance_enrollmentId, a."state" AS attendance_state, a."observation" AS attendance_observation, a."justification" AS attendance_justification, a."updatedById" AS attendance_updatedById, a."importJobId" AS attendance_importJobId, a."updatedAt" AS attendance_updatedAt, a."createdAt" AS attendance_createdAt, ' +
      'e."id" AS enrollment_id, e."participantId" AS enrollment_participantId, e."courseId" AS enrollment_courseId, e."createdAt" AS enrollment_createdAt, e."updatedAt" AS enrollment_updatedAt, e."role" AS enrollment_role, e."importJobId" AS enrollment_importJobId, ' +
      'p."id" AS participant_id, p."email" AS participant_email, p."name" AS participant_name, p."providerId" AS participant_providerId, p."createdAt" AS participant_createdAt, p."updatedAt" AS participant_updatedAt, ' +
      'c."id" AS course_id, c."code" AS course_code, c."name" AS course_name, c."startDate" AS course_startDate, c."endDate" AS course_endDate, c."providerId" AS course_providerId, c."status" AS course_status, c."description" AS course_description, c."location" AS course_location, c."modality" AS course_modality, c."createdAt" AS course_createdAt, c."updatedAt" AS course_updatedAt ' +
      'FROM "Attendance" a ' +
      'JOIN "Enrollment" e ON e."id" = a."enrollmentId" ' +
      'JOIN "Participant" p ON p."id" = e."participantId" ' +
      'JOIN "Course" c ON c."id" = e."courseId" ' +
      'WHERE a."sessionId" = $1',
    [sessionId]
  );

  return rows.map((row) => ({
    id: row.attendance_id,
    sessionId: row.attendance_sessionId,
    enrollmentId: row.attendance_enrollmentId,
    state: row.attendance_state,
    observation: row.attendance_observation,
    justification: row.attendance_justification,
    updatedById: row.attendance_updatedById,
    importJobId: row.attendance_importJobId,
    updatedAt: row.attendance_updatedAt,
    createdAt: row.attendance_createdAt,
    enrollment: {
      id: row.enrollment_id,
      participantId: row.enrollment_participantId,
      courseId: row.enrollment_courseId,
      createdAt: row.enrollment_createdAt,
      updatedAt: row.enrollment_updatedAt,
      role: row.enrollment_role,
      importJobId: row.enrollment_importJobId,
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
        status: row.course_status,
        description: row.course_description,
        location: row.course_location,
        modality: row.course_modality,
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
  justification?: string;
  updatedById?: string;
}

export async function upsertAttendance(
  data: AttendanceUpsertData,
  client?: DatabaseClient
): Promise<DbAttendance> {
  const update = await queryOne<DbAttendance>(
    'UPDATE "Attendance" SET "state" = $3, "observation" = $4, "justification" = $5, "updatedById" = $6, "updatedAt" = CURRENT_TIMESTAMP ' +
      'WHERE "sessionId" = $1 AND "enrollmentId" = $2 RETURNING *',
    [
      data.sessionId,
      data.enrollmentId,
      data.state,
      data.observation ?? null,
      data.justification ?? null,
      data.updatedById ?? null
    ],
    client
  );

  if (update) return update;

  const insert = await queryOne<DbAttendance>(
    'INSERT INTO "Attendance" ("sessionId", "enrollmentId", "state", "observation", "justification", "updatedById") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [
      data.sessionId,
      data.enrollmentId,
      data.state,
      data.observation ?? null,
      data.justification ?? null,
      data.updatedById ?? null
    ],
    client
  );

  if (!insert) throw new Error("Failed to upsert attendance record");
  return insert;
}
