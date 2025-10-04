import type { GradeType } from "../types/grades.js";
import { query, queryOne } from "./pool.js";

export interface DbGrade {
  id: string;
  enrollmentId: string;
  type: GradeType;
  score: number;
  date: Date;
  evaluationSchemeId: string | null;
  observation: string | null;
  importJobId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GradeWithRelations extends DbGrade {
  enrollment: {
    id: string;
    participantId: string;
    courseId: string;
    createdAt: Date;
    updatedAt: Date;
    role: string | null;
    participant: {
      id: string;
      email: string;
      name: string;
      providerId: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
  };
  evaluationScheme: {
    id: string;
    courseId: string;
    label: string;
    gradeType: string;
    weight: number;
    minScore: number;
    maxScore: number;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

export async function listGradesByCourse(courseId: string): Promise<GradeWithRelations[]> {
  const rows = await query<{
    grade_id: string;
    grade_enrollmentId: string;
    grade_type: GradeType;
    grade_score: number;
    grade_date: Date;
    grade_evaluationSchemeId: string | null;
    grade_observation: string | null;
    grade_importJobId: string | null;
    enrollment_id: string;
    enrollment_participantId: string;
    enrollment_courseId: string;
    enrollment_createdAt: Date;
    enrollment_updatedAt: Date;
    enrollment_role: string | null;
    participant_id: string;
    participant_email: string;
    participant_name: string;
    participant_providerId: string | null;
    participant_createdAt: Date;
    participant_updatedAt: Date;
    scheme_id: string | null;
    scheme_courseId: string | null;
    scheme_label: string | null;
    scheme_gradeType: string | null;
    scheme_weight: number | null;
    scheme_minScore: number | null;
    scheme_maxScore: number | null;
    scheme_createdAt: Date | null;
    scheme_updatedAt: Date | null;
  }>(
    'SELECT g."id" AS grade_id, g."enrollmentId" AS grade_enrollmentId, g."type" AS grade_type, g."score" AS grade_score, g."date" AS grade_date, g."evaluationSchemeId" AS grade_evaluationSchemeId, g."observation" AS grade_observation, g."importJobId" AS grade_importJobId, ' +
      'e."id" AS enrollment_id, e."participantId" AS enrollment_participantId, e."courseId" AS enrollment_courseId, e."createdAt" AS enrollment_createdAt, e."updatedAt" AS enrollment_updatedAt, e."role" AS enrollment_role, ' +
      'p."id" AS participant_id, p."email" AS participant_email, p."name" AS participant_name, p."providerId" AS participant_providerId, p."createdAt" AS participant_createdAt, p."updatedAt" AS participant_updatedAt, ' +
      'es."id" AS scheme_id, es."courseId" AS scheme_courseId, es."label" AS scheme_label, es."gradeType" AS scheme_gradeType, es."weight" AS scheme_weight, es."minScore" AS scheme_minScore, es."maxScore" AS scheme_maxScore, es."createdAt" AS scheme_createdAt, es."updatedAt" AS scheme_updatedAt ' +
      'FROM "Grade" g ' +
      'JOIN "Enrollment" e ON e."id" = g."enrollmentId" ' +
      'JOIN "Participant" p ON p."id" = e."participantId" ' +
      'LEFT JOIN "EvaluationScheme" es ON es."id" = g."evaluationSchemeId" ' +
      'WHERE e."courseId" = $1',
    [courseId]
  );

  return rows.map((row) => ({
    id: row.grade_id,
    enrollmentId: row.grade_enrollmentId,
    type: row.grade_type,
    score: row.grade_score,
    date: row.grade_date,
    evaluationSchemeId: row.grade_evaluationSchemeId,
    observation: row.grade_observation,
    importJobId: row.grade_importJobId,
    enrollment: {
      id: row.enrollment_id,
      participantId: row.enrollment_participantId,
      courseId: row.enrollment_courseId,
      createdAt: row.enrollment_createdAt,
      updatedAt: row.enrollment_updatedAt,
      role: row.enrollment_role,
      participant: {
        id: row.participant_id,
        email: row.participant_email,
        name: row.participant_name,
        providerId: row.participant_providerId,
        createdAt: row.participant_createdAt,
        updatedAt: row.participant_updatedAt
      }
    },
    evaluationScheme:
      row.scheme_id
        ? {
            id: row.scheme_id,
            courseId: row.scheme_courseId!,
            label: row.scheme_label!,
            gradeType: row.scheme_gradeType!,
            weight: row.scheme_weight!,
            minScore: row.scheme_minScore!,
            maxScore: row.scheme_maxScore!,
            createdAt: row.scheme_createdAt!,
            updatedAt: row.scheme_updatedAt!
          }
        : null
  }));
}

export interface CreateGradeInput {
  enrollmentId: string;
  type: GradeType;
  score: number;
  date?: Date;
  evaluationSchemeId?: string;
  observation?: string | null;
}

export async function createGrade(input: CreateGradeInput): Promise<DbGrade> {
  const row = await queryOne<DbGrade>(
    'INSERT INTO "Grade" ("enrollmentId", "type", "score", "date", "evaluationSchemeId", "observation") VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [
      input.enrollmentId,
      input.type,
      input.score,
      input.date ?? new Date(),
      input.evaluationSchemeId ?? null,
      input.observation ?? null
    ]
  );

  if (!row) throw new Error("Failed to create grade");
  return row;
}
