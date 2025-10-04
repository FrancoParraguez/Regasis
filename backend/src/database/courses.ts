import type { CourseStatus } from "../types/courses.js";
import { query, queryOne, withTransaction } from "./pool.js";
import type { DbProvider } from "./providers.js";

export interface DbCourse {
  id: string;
  code: string;
  name: string;
  startDate: Date;
  endDate: Date;
  providerId: string;
  status: CourseStatus;
  description: string | null;
  location: string | null;
  modality: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseWithProvider extends DbCourse {
  provider: DbProvider;
}

export interface CourseInstructorRow {
  id: string;
  courseId: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    providerId: string | null;
  };
}

export interface EvaluationSchemeRow {
  id: string;
  courseId: string;
  label: string;
  gradeType: string;
  weight: number;
  minScore: number;
  maxScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseFull extends CourseWithProvider {
  instructors: CourseInstructorRow[];
  evaluationSchemes: EvaluationSchemeRow[];
}

export async function listCourses(): Promise<CourseFull[]> {
  const courses = await query<DbCourse & {
    provider_id: string;
    provider_name: string;
    provider_createdAt: Date;
    provider_updatedAt: Date;
  }>(
    'SELECT c."id", c."code", c."name", c."startDate", c."endDate", c."providerId", c."status", c."description", c."location", c."modality", c."createdAt", c."updatedAt", ' +
      'p."id" AS provider_id, p."name" AS provider_name, p."createdAt" AS provider_createdAt, p."updatedAt" AS provider_updatedAt ' +
      'FROM "Course" c JOIN "Provider" p ON p."id" = c."providerId"'
  );

  if (courses.length === 0) return [];
  const courseIds = courses.map((course) => course.id);

  const instructors = await query<{
    id: string;
    courseId: string;
    userId: string;
    user_id: string;
    user_email: string;
    user_name: string;
    user_role: string;
    user_providerId: string | null;
  }>(
    'SELECT ci."id", ci."courseId", ci."userId", u."id" AS user_id, u."email" AS user_email, u."name" AS user_name, u."role" AS user_role, u."providerId" AS user_providerId ' +
      'FROM "CourseInstructor" ci JOIN "User" u ON u."id" = ci."userId" WHERE ci."courseId" = ANY($1)',
    [courseIds]
  );

  const evaluationSchemes = await query<EvaluationSchemeRow>(
    'SELECT "id", "courseId", "label", "gradeType", "weight", "minScore", "maxScore", "createdAt", "updatedAt" FROM "EvaluationScheme" WHERE "courseId" = ANY($1)',
    [courseIds]
  );

  return courses.map((course) => ({
    id: course.id,
    code: course.code,
    name: course.name,
    startDate: course.startDate,
    endDate: course.endDate,
    providerId: course.providerId,
    status: course.status as CourseStatus,
    description: course.description,
    location: course.location,
    modality: course.modality,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    provider: {
      id: course.provider_id,
      name: course.provider_name,
      createdAt: course.provider_createdAt,
      updatedAt: course.provider_updatedAt
    },
    instructors: instructors
      .filter((instructor) => instructor.courseId === course.id)
      .map((instructor) => ({
        id: instructor.id,
        courseId: instructor.courseId,
        userId: instructor.userId,
        user: {
          id: instructor.user_id,
          email: instructor.user_email,
          name: instructor.user_name,
          role: instructor.user_role,
          providerId: instructor.user_providerId
        }
      })),
    evaluationSchemes: evaluationSchemes.filter((scheme) => scheme.courseId === course.id)
  }));
}

export interface CreateCourseInput {
  code: string;
  name: string;
  startDate: Date;
  endDate: Date;
  providerId: string;
  description?: string | null;
  location?: string | null;
  modality?: string | null;
  status?: CourseStatus;
  instructorIds?: string[];
  evaluationSchemes?: Array<{
    label: string;
    gradeType: string;
    weight: number;
    minScore: number;
    maxScore: number;
  }>;
}

export async function createCourse(input: CreateCourseInput): Promise<CourseFull> {
  return withTransaction(async (client) => {
    const courseRow = await queryOne<DbCourse>(
      'INSERT INTO "Course" ("code", "name", "startDate", "endDate", "providerId", "description", "location", "modality", "status") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [
        input.code,
        input.name,
        input.startDate,
        input.endDate,
        input.providerId,
        input.description ?? null,
        input.location ?? null,
        input.modality ?? null,
        input.status ?? "DRAFT"
      ],
      client
    );

    if (!courseRow) throw new Error("Failed to create course");

    const instructorIds = input.instructorIds ?? [];
    if (instructorIds.length > 0) {
      await Promise.all(
        instructorIds.map((userId) =>
          query(
            'INSERT INTO "CourseInstructor" ("courseId", "userId") VALUES ($1, $2) ON CONFLICT ("courseId", "userId") DO NOTHING',
            [courseRow.id, userId],
            client
          )
        )
      );
    }

    const schemes = input.evaluationSchemes ?? [];
    if (schemes.length > 0) {
      await Promise.all(
        schemes.map((scheme) =>
          query(
            'INSERT INTO "EvaluationScheme" ("courseId", "label", "gradeType", "weight", "minScore", "maxScore") VALUES ($1,$2,$3,$4,$5,$6)',
            [
              courseRow.id,
              scheme.label,
              scheme.gradeType,
              scheme.weight,
              scheme.minScore,
              scheme.maxScore
            ],
            client
          )
        )
      );
    }

    const [provider] = await query<DbProvider>(
      'SELECT "id", "name", "createdAt", "updatedAt" FROM "Provider" WHERE "id" = $1',
      [courseRow.providerId],
      client
    );

    const instructorsForCourse = await query<{
      id: string;
      courseId: string;
      userId: string;
      user_id: string;
      user_email: string;
      user_name: string;
      user_role: string;
      user_providerId: string | null;
    }>(
      'SELECT ci."id", ci."courseId", ci."userId", u."id" AS user_id, u."email" AS user_email, u."name" AS user_name, u."role" AS user_role, u."providerId" AS user_providerId ' +
        'FROM "CourseInstructor" ci JOIN "User" u ON u."id" = ci."userId" WHERE ci."courseId" = $1',
      [courseRow.id],
      client
    );

    const evaluationSchemes = await query<EvaluationSchemeRow>(
      'SELECT "id", "courseId", "label", "gradeType", "weight", "minScore", "maxScore", "createdAt", "updatedAt" FROM "EvaluationScheme" WHERE "courseId" = $1',
      [courseRow.id],
      client
    );

    return {
      ...courseRow,
      status: courseRow.status as CourseStatus,
      provider: provider!,
      instructors: instructorsForCourse.map((instructor) => ({
        id: instructor.id,
        courseId: instructor.courseId,
        userId: instructor.userId,
        user: {
          id: instructor.user_id,
          email: instructor.user_email,
          name: instructor.user_name,
          role: instructor.user_role,
          providerId: instructor.user_providerId
        }
      })),
      evaluationSchemes
    };
  });
}

export async function deleteCourse(id: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>('DELETE FROM "Course" WHERE "id" = $1 RETURNING "id"', [id]);
  return Boolean(row);
}

export async function listCoursesForUser(userId?: string): Promise<DbCourse[]> {
  if (!userId) {
    return query<DbCourse>('SELECT * FROM "Course"');
  }

  return query<DbCourse>(
    'SELECT c.* FROM "Course" c WHERE EXISTS (SELECT 1 FROM "CourseInstructor" ci WHERE ci."courseId" = c."id" AND ci."userId" = $1)',
    [userId]
  );
}

export async function findCourseByCode(code: string): Promise<DbCourse | null> {
  return queryOne<DbCourse>('SELECT * FROM "Course" WHERE "code" = $1', [code]);
}
