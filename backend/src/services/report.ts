import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

type ReportFilters = { providerId?: string; from?: Date; to?: Date };

export async function reportAsistencia({ providerId, from, to }: ReportFilters) {
  const dateFilter: Prisma.DateTimeFilter = {};
  if (from) dateFilter.gte = from;
  if (to) dateFilter.lte = to;

  const where: Prisma.AttendanceWhereInput = {
    ...(from || to ? { session: { date: dateFilter } } : {}),
    ...(providerId ? { enrollment: { course: { providerId } } } : {})
  };

  return prisma.attendance.findMany({
    where,
    include: {
      session: { include: { course: true } },
      enrollment: { include: { participant: true } }
    }
  });
}

export async function reportCalificaciones({ providerId, from, to }: ReportFilters) {
  const dateFilter: Prisma.DateTimeFilter = {};
  if (from) dateFilter.gte = from;
  if (to) dateFilter.lte = to;

  const where: Prisma.GradeWhereInput = {
    ...(from || to ? { date: dateFilter } : {}),
    ...(providerId ? { enrollment: { course: { providerId } } } : {})
  };

  return prisma.grade.findMany({
    where,
    include: {
      enrollment: { include: { participant: true, course: true } },
      evaluationScheme: true
    }
  });
}
