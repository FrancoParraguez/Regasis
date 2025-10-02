import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { addDuration } from "../utils/duration.js";

type Role = "ADMIN" | "INSTRUCTOR" | "REPORTER";

interface DemoUser {
  id: string;
  email: string;
  name: string;
  password: string;
  role: Role;
  providerId: string;
}

interface DemoCourse {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  providerId: string;
  instructorIds: string[];
}

interface DemoSession {
  id: string;
  courseId: string;
  date: string;
}

interface DemoRefreshToken {
  jti: string;
  userId: string;
  expiresAt: Date;
  revoked: boolean;
}

const providerId = "demo-provider";

const provider = {
  id: providerId,
  name: "ACME Capacitación",
  createdAt: new Date("2025-01-01").toISOString(),
  updatedAt: new Date("2025-01-01").toISOString()
};

const users: DemoUser[] = [
  {
    id: "demo-admin",
    email: "admin@org",
    name: "Admin",
    password: "$2b$10$vL56KzxMpswj5SP8yNQqAuc80Cgmw0DttQbHW6Fy4M4TwWCeekeIG",
    role: "ADMIN",
    providerId
  },
  {
    id: "demo-instructor",
    email: "instructor@org",
    name: "Instr",
    password: "$2b$10$H4DtPuieLchxIgCrHVZRWuQvVIskbbtfB5Wyw8yQy.yTcJ0gvmQ9G",
    role: "INSTRUCTOR",
    providerId
  },
  {
    id: "demo-reporter",
    email: "reporter@org",
    name: "Reporter",
    password: "$2b$10$GYBKKsly4dvsNpFH/mVyfugQWiuAMEDl.KbuvMTjJAdMtvXog4Dii",
    role: "REPORTER",
    providerId
  }
];

const courses: DemoCourse[] = [
  {
    id: "demo-course-1",
    code: "CUR-001",
    name: "Seguridad en Obra",
    startDate: new Date("2025-10-02").toISOString(),
    endDate: new Date("2025-10-30").toISOString(),
    providerId,
    instructorIds: ["demo-instructor"]
  }
];

const sessions: DemoSession[] = [
  {
    id: "demo-session-1",
    courseId: "demo-course-1",
    date: new Date("2025-10-03").toISOString()
  }
];

const refreshTokens = new Map<string, DemoRefreshToken>();

export function findDemoUserByEmail(email: string) {
  return users.find((user) => user.email === email);
}

export function findDemoUserById(id: string) {
  return users.find((user) => user.id === id);
}

export function listDemoCourses(userId: string, role: Role) {
  const targetCourses =
    role === "INSTRUCTOR"
      ? courses.filter((course) => course.instructorIds.includes(userId))
      : courses;

  return targetCourses.map((course) => ({
    id: course.id,
    code: course.code,
    name: course.name,
    startDate: new Date(course.startDate),
    endDate: new Date(course.endDate),
    providerId: course.providerId
  }));
}

export function listAllDemoCourses() {
  return courses.map((course) => ({
    id: course.id,
    code: course.code,
    name: course.name,
    startDate: new Date(course.startDate),
    endDate: new Date(course.endDate),
    providerId: course.providerId,
    createdAt: new Date(course.startDate),
    updatedAt: new Date(course.endDate),
    provider: {
      ...provider,
      createdAt: new Date(provider.createdAt),
      updatedAt: new Date(provider.updatedAt)
    },
    instructors: course.instructorIds.map((userId) => {
      const user = findDemoUserById(userId);
      return {
        id: `${course.id}:${userId}`,
        courseId: course.id,
        userId,
        user: user
          ? {
              id: user.id,
              email: user.email,
              name: user.name,
              password: user.password,
              role: user.role,
              providerId: user.providerId,
              createdAt: new Date(provider.createdAt),
              updatedAt: new Date(provider.updatedAt)
            }
          : null
      };
    })
  }));
}

export function listDemoSessions(userId: string) {
  const instructorCourses = courses.filter((course) =>
    course.instructorIds.includes(userId)
  );
  const courseIds = new Set(instructorCourses.map((course) => course.id));

  return sessions
    .filter((session) => courseIds.has(session.courseId))
    .map((session) => {
      const course = instructorCourses.find((c) => c.id === session.courseId)!;
      return {
        id: session.id,
        courseId: session.courseId,
        date: new Date(session.date),
        course: {
          id: course.id,
          code: course.code,
          name: course.name,
          startDate: new Date(course.startDate),
          endDate: new Date(course.endDate),
          providerId: course.providerId,
          createdAt: new Date(course.startDate),
          updatedAt: new Date(course.endDate)
        }
      };
    });
}

export function createDemoRefreshToken(userId: string) {
  const jti = randomUUID();
  const expiresAt = addDuration(new Date(), env.REFRESH_EXPIRES);
  const entry: DemoRefreshToken = { jti, userId, expiresAt, revoked: false };
  refreshTokens.set(jti, entry);
  return entry;
}

export function findDemoRefreshToken(jti: string) {
  return refreshTokens.get(jti);
}

export function revokeDemoRefreshToken(jti: string) {
  const entry = refreshTokens.get(jti);
  if (entry) {
    entry.revoked = true;
  }
}

export function replaceDemoRefreshToken(jti: string) {
  const current = refreshTokens.get(jti);
  if (!current || current.revoked || current.expiresAt < new Date()) {
    return null;
  }
  current.revoked = true;
  return createDemoRefreshToken(current.userId);
}
