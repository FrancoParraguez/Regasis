-- Script para crear todas las tablas, enums, índices y llaves foráneas del proyecto Regasis.
-- Compatible con PostgreSQL.

-- === Limpieza opcional ===
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SET search_path TO public;

-- === Enums ===
CREATE TYPE "Role" AS ENUM ('ADMIN', 'INSTRUCTOR', 'REPORTER');
CREATE TYPE "AttendanceState" AS ENUM ('PRESENTE', 'AUSENTE', 'JUSTIFICADO');
CREATE TYPE "GradeType" AS ENUM ('P1', 'P2', 'EXAMEN', 'PRACTICA', 'OTRO');

-- === Tablas ===
CREATE TABLE "Provider" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_providerId_fkey" FOREIGN KEY ("providerId")
        REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Course" (
    "id" TEXT PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Course_providerId_fkey" FOREIGN KEY ("providerId")
        REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "CourseInstructor" (
    "id" TEXT PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "CourseInstructor_courseId_fkey" FOREIGN KEY ("courseId")
        REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CourseInstructor_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CourseInstructor_courseId_userId_key" UNIQUE ("courseId", "userId")
);

CREATE TABLE "Participant" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participant_providerId_fkey" FOREIGN KEY ("providerId")
        REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Enrollment" (
    "id" TEXT PRIMARY KEY,
    "participantId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enrollment_participantId_courseId_key" UNIQUE ("participantId", "courseId"),
    CONSTRAINT "Enrollment_participantId_fkey" FOREIGN KEY ("participantId")
        REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId")
        REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Session" (
    "id" TEXT PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_courseId_fkey" FOREIGN KEY ("courseId")
        REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Attendance" (
    "id" TEXT PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "state" "AttendanceState" NOT NULL,
    "observation" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_sessionId_enrollmentId_key" UNIQUE ("sessionId", "enrollmentId"),
    CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId")
        REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId")
        REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attendance_updatedById_fkey" FOREIGN KEY ("updatedById")
        REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Grade" (
    "id" TEXT PRIMARY KEY,
    "enrollmentId" TEXT NOT NULL,
    "type" "GradeType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Grade_enrollmentId_fkey" FOREIGN KEY ("enrollmentId")
        REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "AuditLog" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "ip" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "RefreshToken" (
    "id" TEXT PRIMARY KEY,
    "jti" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Índices adicionales
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog" ("userId");
CREATE INDEX "Enrollment_courseId_idx" ON "Enrollment" ("courseId");
CREATE INDEX "Enrollment_participantId_idx" ON "Enrollment" ("participantId");
CREATE INDEX "Session_courseId_idx" ON "Session" ("courseId");
CREATE INDEX "Attendance_sessionId_idx" ON "Attendance" ("sessionId");
CREATE INDEX "Attendance_enrollmentId_idx" ON "Attendance" ("enrollmentId");
CREATE INDEX "Grade_enrollmentId_idx" ON "Grade" ("enrollmentId");

