import type { GradeType } from "../types/grades.js";
import { query, queryOne } from "./pool.js";

export interface DbGrade {
  id: string;
  enrollmentId: string;
  type: GradeType;
  score: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GradeWithRelations extends DbGrade {
  enrollment: {
    id: string;
    participantId: string;
    courseId: string;
    createdAt: Date;
    participant: {
      id: string;
      email: string;
      name: string;
      providerId: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
  };
}

export async function listGradesByCourse(courseId: string): Promise<GradeWithRelations[]> {
  const rows = await query<{
    grade_id: string;
    grade_enrollmentId: string;
    grade_type: GradeType;
    grade_score: number;
    grade_date: Date;
    grade_createdAt: Date;
    grade_updatedAt: Date;
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
    'SELECT g."id" AS grade_id, g."enrollmentId" AS grade_enrollmentId, g."type" AS grade_type, g."score" AS grade_score, g."date" AS grade_date, g."createdAt" AS grade_createdAt, g."updatedAt" AS grade_updatedAt, ' +
      'e."id" AS enrollment_id, e."participantId" AS enrollment_participantId, e."courseId" AS enrollment_courseId, e."createdAt" AS enrollment_createdAt, ' +
      'p."id" AS participant_id, p."email" AS participant_email, p."name" AS participant_name, p."providerId" AS participant_providerId, p."createdAt" AS participant_createdAt, p."updatedAt" AS participant_updatedAt ' +
      'FROM "Grade" g ' +
      'JOIN "Enrollment" e ON e."id" = g."enrollmentId" ' +
      'JOIN "Participant" p ON p."id" = e."participantId" ' +
      'WHERE e."courseId" = $1',
    [courseId]
  );

  return rows.map((row) => ({
    id: row.grade_id,
    enrollmentId: row.grade_enrollmentId,
    type: row.grade_type,
    score: row.grade_score,
    date: row.grade_date,
    createdAt: row.grade_createdAt,
    updatedAt: row.grade_updatedAt,
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

export interface CreateGradeInput {
  enrollmentId: string;
  type: GradeType;
  score: number;
  date?: Date;
}

export async function createGrade(input: CreateGradeInput): Promise<DbGrade> {
  const row = await queryOne<DbGrade>(
    'INSERT INTO "Grade" ("enrollmentId", "type", "score", "date") VALUES ($1,$2,$3,$4) RETURNING *',
    [input.enrollmentId, input.type, input.score, input.date ?? new Date()]
  );

  if (!row) throw new Error("Failed to create grade");
  return row;
}
