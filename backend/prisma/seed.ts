import { PrismaClient, Role, CourseStatus, GradeType } from "@prisma/client";
import { hashPassword } from "../src/utils/crypto.js";

const prisma = new PrismaClient();

async function main() {
  const provider = await prisma.provider.upsert({
    where: { name: "ACME Capacitación" },
    update: {},
    create: { name: "ACME Capacitación" }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@org" },
    update: {},
    create: {
      email: "admin@org",
      name: "Admin",
      firstName: "Admin",
      lastName: "Principal",
      password: await hashPassword("admin123"),
      role: Role.ADMIN,
      providerId: provider.id
    }
  });

  const inst = await prisma.user.upsert({
    where: { email: "instructor@org" },
    update: {},
    create: {
      email: "instructor@org",
      name: "Instr",
      firstName: "Inés",
      lastName: "Tructor",
      password: await hashPassword("instructor123"),
      role: Role.INSTRUCTOR,
      providerId: provider.id
    }
  });

  await prisma.user.upsert({
    where: { email: "reporter@org" },
    update: {},
    create: {
      email: "reporter@org",
      name: "Reporter",
      firstName: "Rey",
      lastName: "Porter",
      password: await hashPassword("reporter123"),
      role: Role.REPORTER,
      providerId: provider.id
    }
  });

  const course = await prisma.course.upsert({
    where: { code: "CUR-001" },
    update: {},
    create: {
      code: "CUR-001",
      name: "Seguridad en Obra",
      startDate: new Date("2025-10-02"),
      endDate: new Date("2025-10-30"),
      providerId: provider.id,
      status: CourseStatus.IN_PROGRESS,
      description: "Curso introductorio a la seguridad industrial",
      location: "Sala 1",
      modality: "Presencial"
    }
  });

  await prisma.evaluationScheme.deleteMany({ where: { courseId: course.id } });
  const examScheme = await prisma.evaluationScheme.create({
    data: {
      courseId: course.id,
      label: "Examen Final",
      gradeType: GradeType.EXAMEN,
      weight: 0.6,
      minScore: 0,
      maxScore: 20
    }
  });
  const practiceScheme = await prisma.evaluationScheme.create({
    data: {
      courseId: course.id,
      label: "Prácticas",
      gradeType: GradeType.PRACTICA,
      weight: 0.4,
      minScore: 0,
      maxScore: 20
    }
  });

  await prisma.courseInstructor.upsert({
    where: { courseId_userId: { courseId: course.id, userId: inst.id } },
    update: {},
    create: { courseId: course.id, userId: inst.id }
  });

  const p1 = await prisma.participant.upsert({
    where: { email: "ana@example.com" },
    update: {},
    create: { email: "ana@example.com", name: "Ana Soto", providerId: provider.id }
  });
  const p2 = await prisma.participant.upsert({
    where: { email: "leo@example.com" },
    update: {},
    create: { email: "leo@example.com", name: "Leandro Ruiz", providerId: provider.id }
  });

  const e1 = await prisma.enrollment.upsert({
    where: { participantId_courseId: { participantId: p1.id, courseId: course.id } },
    update: { role: "Alumno" },
    create: { participantId: p1.id, courseId: course.id, role: "Alumno" }
  });
  const e2 = await prisma.enrollment.upsert({
    where: { participantId_courseId: { participantId: p2.id, courseId: course.id } },
    update: { role: "Alumno" },
    create: { participantId: p2.id, courseId: course.id, role: "Alumno" }
  });

  const s1 = await prisma.session.create({
    data: { courseId: course.id, date: new Date("2025-10-03") }
  });

  await prisma.attendance.createMany({
    data: [
      { sessionId: s1.id, enrollmentId: e1.id, state: "PRESENTE" },
      { sessionId: s1.id, enrollmentId: e2.id, state: "AUSENTE" }
    ]
  });

  await prisma.grade.createMany({
    data: [
      {
        enrollmentId: e1.id,
        type: GradeType.EXAMEN,
        score: 18,
        evaluationSchemeId: examScheme.id
      },
      {
        enrollmentId: e1.id,
        type: GradeType.PRACTICA,
        score: 16,
        evaluationSchemeId: practiceScheme.id
      }
    ],
    skipDuplicates: true
  });

  console.log({ admin: admin.email, course: course.code });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
