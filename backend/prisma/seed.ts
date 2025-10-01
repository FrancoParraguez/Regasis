import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/utils/crypto.js";
const prisma = new PrismaClient();

async function main(){
  const provider = await prisma.provider.upsert({
    where: { name: "ACME CapacitaciÃ³n" },
    update: {},
    create: { name: "ACME CapacitaciÃ³n" }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@org" },
    update: {},
    create: {
      email: "admin@org", name: "Admin",
      password: await hashPassword("admin123"),
      role: Role.ADMIN, providerId: provider.id
    }
  });
  const inst = await prisma.user.upsert({
    where: { email: "instructor@org" },
    update: {},
    create: {
      email: "instructor@org", name: "Instr",
      password: await hashPassword("instructor123"),
      role: Role.INSTRUCTOR, providerId: provider.id
    }
  });
  await prisma.user.upsert({
    where: { email: "reporter@org" },
    update: {},
    create: {
      email: "reporter@org", name: "Reporter",
      password: await hashPassword("reporter123"),
      role: Role.REPORTER, providerId: provider.id
    }
  });

  const course = await prisma.course.upsert({
    where: { code: "CUR-001" },
    update: {},
    create: {
      code: "CUR-001", name: "Seguridad en Obra",
      startDate: new Date("2025-10-02"), endDate: new Date("2025-10-30"),
      providerId: provider.id
    }
  });
  await prisma.courseInstructor.upsert({
    where: { courseId_userId: { courseId: course.id, userId: inst.id } },
    update: {}, create: { courseId: course.id, userId: inst.id }
  });

  const p1 = await prisma.participant.upsert({
    where: { email: "ana@example.com" },
    update: {}, create: { email: "ana@example.com", name: "Ana Soto", providerId: provider.id }
  });
  const p2 = await prisma.participant.upsert({
    where: { email: "leo@example.com" },
    update: {}, create: { email: "leo@example.com", name: "Leandro Ruiz", providerId: provider.id }
  });

  const e1 = await prisma.enrollment.upsert({
    where: { participantId_courseId: { participantId: p1.id, courseId: course.id } },
    update: {}, create: { participantId: p1.id, courseId: course.id }
  });
  const e2 = await prisma.enrollment.upsert({
    where: { participantId_courseId: { participantId: p2.id, courseId: course.id } },
    update: {}, create: { participantId: p2.id, courseId: course.id }
  });

  const s1 = await prisma.session.create({ data: { courseId: course.id, date: new Date("2025-10-03") } });

  await prisma.attendance.createMany({ data: [
    { sessionId: s1.id, enrollmentId: e1.id, state: "PRESENTE" },
    { sessionId: s1.id, enrollmentId: e2.id, state: "AUSENTE" }
  ]});
  console.log({ admin: admin.email, course: course.code });
}
main().finally(()=>prisma.$disconnect());
