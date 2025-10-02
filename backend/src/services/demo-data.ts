import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { addDuration } from "../utils/duration.js";
import type { Role } from "../types/roles.js";

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
  createdAt: string;
  updatedAt: string;
}

interface DemoSession {
  id: string;
  courseId: string;
  date: string;
}

interface DemoProvider {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface DemoRefreshToken {
  jti: string;
  userId: string;
  expiresAt: Date;
  revoked: boolean;
}

const providerId = "demo-provider";

const providers: DemoProvider[] = [
  {
    id: providerId,
    name: "ACME Capacitación",
    createdAt: new Date("2025-01-01").toISOString(),
    updatedAt: new Date("2025-01-01").toISOString()
  }
];

export function listDemoProviders() {
  return providers.map((provider) => ({
    ...provider,
    createdAt: new Date(provider.createdAt),
    updatedAt: new Date(provider.updatedAt)
  }));
}

export function createDemoProvider(input: { name: string }) {
  const name = input.name?.trim();
  if (!name) {
    throw new Error("El nombre del proveedor es obligatorio.");
  }

  const exists = providers.some(
    (provider) => provider.name.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    throw new Error("Ya existe un proveedor con ese nombre.");
  }

  const now = new Date();
  const provider: DemoProvider = {
    id: randomUUID(),
    name,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  providers.push(provider);
  providers.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));

  return {
    ...provider,
    createdAt: new Date(provider.createdAt),
    updatedAt: new Date(provider.updatedAt)
  };
}

function findDemoProviderById(id: string) {
  return providers.find((provider) => provider.id === id);
}

export function listDemoProviders() {
  return [
    {
      ...provider,
      createdAt: new Date(provider.createdAt),
      updatedAt: new Date(provider.updatedAt)
    }
  ];
}

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
    instructorIds: ["demo-instructor"],
    createdAt: new Date("2025-10-01T12:00:00Z").toISOString(),
    updatedAt: new Date("2025-10-01T12:00:00Z").toISOString()
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
    createdAt: new Date(course.createdAt),
    updatedAt: new Date(course.updatedAt),
    providerId: course.providerId
  }));
}

export function listAllDemoCourses() {
  return courses.map((course) => {
    const provider = findDemoProviderById(course.providerId) ?? providers[0]!;

    return {
      id: course.id,
      code: course.code,
      name: course.name,
      startDate: new Date(course.startDate),
      endDate: new Date(course.endDate),
      providerId: course.providerId,
      createdAt: new Date(course.createdAt),
      updatedAt: new Date(course.updatedAt),
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
    };
  });
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
          createdAt: new Date(course.createdAt),
          updatedAt: new Date(course.updatedAt)
        }
      };
    });
}

function normalizeDate(input: string | Date): Date {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Fecha inválida");
  }
  return date;
}

export function createDemoCourse(input: {
  code: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  providerId: string;
  instructorIds?: string[];
}) {
  const code = input.code?.trim();
  const name = input.name?.trim();
  const providerId = input.providerId?.trim();

  if (!code) {
    throw new Error("Código requerido");
  }
  if (!name) {
    throw new Error("Nombre requerido");
  }
  if (!providerId) {
    throw new Error("Proveedor requerido");
  }

  if (!findDemoProviderById(providerId)) {
    throw new Error("Proveedor inválido. Selecciona un proveedor existente.");
  }

  const now = new Date();
  const startDate = normalizeDate(input.startDate);
  const endDate = normalizeDate(input.endDate);

  if (endDate < startDate) {
    throw new Error("La fecha de término debe ser posterior al inicio");
  }

  const course: DemoCourse = {
    id: randomUUID(),
    code,
    name,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    providerId,
    instructorIds: [...(input.instructorIds ?? [])],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  courses.push(course);

  return {
    id: course.id,
    code: course.code,
    name: course.name,
    startDate,
    endDate,
    providerId: course.providerId,
    createdAt: new Date(course.createdAt),
    updatedAt: new Date(course.updatedAt)
  };
}

export function deleteDemoCourse(id: string) {
  const index = courses.findIndex((course) => course.id === id);
  if (index === -1) {
    return false;
  }

  courses.splice(index, 1);

  // Remove sessions associated to the course so future listings stay consistent.
  for (let i = sessions.length - 1; i >= 0; i -= 1) {
    if (sessions[i]!.courseId === id) {
      sessions.splice(i, 1);
    }
  }

  return true;
}

export function createDemoSession(input: { courseId: string; date: Date | string }) {
  const course = courses.find((item) => item.id === input.courseId);
  if (!course) {
    throw new Error("Curso no encontrado");
  }

  const date = normalizeDate(input.date);
  const session: DemoSession = {
    id: randomUUID(),
    courseId: course.id,
    date: date.toISOString()
  };

  sessions.push(session);

  return {
    id: session.id,
    courseId: session.courseId,
    date
  };
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
