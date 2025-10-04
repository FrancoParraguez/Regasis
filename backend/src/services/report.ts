import { query } from "../database/pool.js";
import type { AttendanceState } from "../types/attendance.js";
import type { GradeType } from "../types/grades.js";

type ReportFilters = { providerId?: string; from?: Date; to?: Date };

export async function reportAsistencia({ providerId, from, to }: ReportFilters) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (from) {
    params.push(from);
    conditions.push(`s."date" >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`s."date" <= $${params.length}`);
  }
  if (providerId) {
    params.push(providerId);
    conditions.push(`c."providerId" = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query<{
    attendance_id: string;
    attendance_sessionId: string;
    attendance_enrollmentId: string;
    attendance_state: AttendanceState;
    attendance_observation: string | null;
    attendance_updatedById: string | null;
    attendance_updatedAt: Date;
    attendance_createdAt: Date;
    session_id: string;
    session_courseId: string;
    session_date: Date;
    course_id: string;
    course_code: string;
    course_name: string;
    course_startDate: Date;
    course_endDate: Date;
    course_providerId: string;
    course_createdAt: Date;
    course_updatedAt: Date;
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
  }>(
    'SELECT a."id" AS attendance_id, a."sessionId" AS attendance_sessionId, a."enrollmentId" AS attendance_enrollmentId, a."state" AS attendance_state, a."observation" AS attendance_observation, a."updatedById" AS attendance_updatedById, a."updatedAt" AS attendance_updatedAt, a."createdAt" AS attendance_createdAt, ' +
      's."id" AS session_id, s."courseId" AS session_courseId, s."date" AS session_date, ' +
      'c."id" AS course_id, c."code" AS course_code, c."name" AS course_name, c."startDate" AS course_startDate, c."endDate" AS course_endDate, c."providerId" AS course_providerId, c."createdAt" AS course_createdAt, c."updatedAt" AS course_updatedAt, ' +
      'e."id" AS enrollment_id, e."participantId" AS enrollment_participantId, e."courseId" AS enrollment_courseId, e."createdAt" AS enrollment_createdAt, ' +
      'p."id" AS participant_id, p."email" AS participant_email, p."name" AS participant_name, p."providerId" AS participant_providerId, p."createdAt" AS participant_createdAt, p."updatedAt" AS participant_updatedAt ' +
      'FROM "Attendance" a ' +
      'JOIN "Session" s ON s."id" = a."sessionId" ' +
      'JOIN "Course" c ON c."id" = s."courseId" ' +
      'JOIN "Enrollment" e ON e."id" = a."enrollmentId" ' +
      'JOIN "Participant" p ON p."id" = e."participantId" ' +
      whereClause,
    params
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
    session: {
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
        createdAt: row.course_createdAt,
        updatedAt: row.course_updatedAt
      }
    },
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
      }
    }
  }));
}

export async function reportCalificaciones({ providerId, from, to }: ReportFilters) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (from) {
    params.push(from);
    conditions.push(`g."date" >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`g."date" <= $${params.length}`);
  }
  if (providerId) {
    params.push(providerId);
    conditions.push(`c."providerId" = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query<{
    grade_id: string;
    grade_enrollmentId: string;
    grade_type: GradeType;
    grade_score: number;
    grade_date: Date;
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
    'SELECT g."id" AS grade_id, g."enrollmentId" AS grade_enrollmentId, g."type" AS grade_type, g."score" AS grade_score, g."date" AS grade_date, ' +
      'e."id" AS enrollment_id, e."participantId" AS enrollment_participantId, e."courseId" AS enrollment_courseId, e."createdAt" AS enrollment_createdAt, ' +
      'p."id" AS participant_id, p."email" AS participant_email, p."name" AS participant_name, p."providerId" AS participant_providerId, p."createdAt" AS participant_createdAt, p."updatedAt" AS participant_updatedAt, ' +
      'c."id" AS course_id, c."code" AS course_code, c."name" AS course_name, c."startDate" AS course_startDate, c."endDate" AS course_endDate, c."providerId" AS course_providerId, c."createdAt" AS course_createdAt, c."updatedAt" AS course_updatedAt ' +
      'FROM "Grade" g ' +
      'JOIN "Enrollment" e ON e."id" = g."enrollmentId" ' +
      'JOIN "Participant" p ON p."id" = e."participantId" ' +
      'JOIN "Course" c ON c."id" = e."courseId" ' +
      whereClause,
    params
  );

  return rows.map((row) => ({
    id: row.grade_id,
    enrollmentId: row.grade_enrollmentId,
    type: row.grade_type,
    score: row.grade_score,
    date: row.grade_date,
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
