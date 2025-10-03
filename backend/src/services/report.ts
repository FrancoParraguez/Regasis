import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function reportAsistencia({ providerId, from, to }:{ providerId?: string; from?: Date; to?: Date }){
  return prisma.attendance.findMany({
    where: {
      session: { date: { gte: from, lte: to } },
      enrollment: { course: providerId ? { providerId } : undefined }
    },
    include: {
      session: { include: { course: true } },
      enrollment: { include: { participant: true } }
    }
  });
}
export async function reportCalificaciones({ providerId, from, to }:{ providerId?: string; from?: Date; to?: Date }){
  return prisma.grade.findMany({
    where: {
      date: { gte: from, lte: to },
      enrollment: { course: providerId ? { providerId } : undefined }
    },
    include: {
      enrollment: { include: { participant: true, course: true } },
      evaluationScheme: true
    }
  });
}
