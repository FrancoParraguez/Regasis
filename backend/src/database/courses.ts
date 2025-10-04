import { query, queryOne, withTransaction } from "./pool.js";
import type { DbProvider } from "./providers.js";

export interface DbCourse {
  id: string;
  code: string;
  name: string;
  startDate: Date;
  endDate: Date;
  providerId: string;
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

export interface CourseFull extends CourseWithProvider {
  instructors: CourseInstructorRow[];
}

export async function listCourses(): Promise<CourseFull[]> {
  const courses = await query<DbCourse & {
    provider_id: string;
    provider_name: string;
    provider_createdAt: Date;
    provider_updatedAt: Date;
  }>(
    'SELECT c."id", c."code", c."name", c."startDate", c."endDate", c."providerId", c."createdAt", c."updatedAt", ' +
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

  return courses.map((course) => ({
    id: course.id,
    code: course.code,
    name: course.name,
    startDate: course.startDate,
    endDate: course.endDate,
    providerId: course.providerId,
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
      }))
  }));
}

export interface CreateCourseInput {
  code: string;
  name: string;
  startDate: Date;
  endDate: Date;
  providerId: string;
  instructorIds?: string[];
}

export async function createCourse(input: CreateCourseInput): Promise<CourseFull> {
  return withTransaction(async (client) => {
    const courseRow = await queryOne<DbCourse>(
      'INSERT INTO "Course" ("code", "name", "startDate", "endDate", "providerId") VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [input.code, input.name, input.startDate, input.endDate, input.providerId],
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

    return {
      ...courseRow,
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
      }))
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
