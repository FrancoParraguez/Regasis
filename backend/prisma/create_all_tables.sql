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
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

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
    "firstName" TEXT,
    "lastName" TEXT,
    "documentType" TEXT,
    "documentNumber" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
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
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "location" TEXT,
    "modality" TEXT,
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

CREATE TABLE "ImportJob" (
    "id" TEXT PRIMARY KEY,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "kind" TEXT NOT NULL,
    "providerId" TEXT,
    "courseId" TEXT,
    "documentId" TEXT,
    "createdById" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportJob_providerId_fkey" FOREIGN KEY ("providerId")
        REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ImportJob_courseId_fkey" FOREIGN KEY ("courseId")
        REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ImportJob_createdById_fkey" FOREIGN KEY ("createdById")
        REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Enrollment" (
    "id" TEXT PRIMARY KEY,
    "participantId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT,
    "importJobId" TEXT,
    CONSTRAINT "Enrollment_participantId_courseId_key" UNIQUE ("participantId", "courseId"),
    CONSTRAINT "Enrollment_participantId_fkey" FOREIGN KEY ("participantId")
        REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId")
        REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_importJobId_fkey" FOREIGN KEY ("importJobId")
        REFERENCES "ImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    "justification" TEXT,
    "importJobId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_sessionId_enrollmentId_key" UNIQUE ("sessionId", "enrollmentId"),
    CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId")
        REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId")
        REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attendance_updatedById_fkey" FOREIGN KEY ("updatedById")
        REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Attendance_importJobId_fkey" FOREIGN KEY ("importJobId")
        REFERENCES "ImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "EvaluationScheme" (
    "id" TEXT PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "gradeType" "GradeType" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "minScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvaluationScheme_courseId_fkey" FOREIGN KEY ("courseId")
        REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Grade" (
    "id" TEXT PRIMARY KEY,
    "enrollmentId" TEXT NOT NULL,
    "type" "GradeType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluationSchemeId" TEXT,
    "observation" TEXT,
    "importJobId" TEXT,
    CONSTRAINT "Grade_enrollmentId_fkey" FOREIGN KEY ("enrollmentId")
        REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Grade_evaluationSchemeId_fkey" FOREIGN KEY ("evaluationSchemeId")
        REFERENCES "EvaluationScheme"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Grade_importJobId_fkey" FOREIGN KEY ("importJobId")
        REFERENCES "ImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Document" (
    "id" TEXT PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT,
    "url" TEXT,
    "metadata" JSONB,
    "createdById" TEXT NOT NULL,
    "providerId" TEXT,
    "courseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById")
        REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_providerId_fkey" FOREIGN KEY ("providerId")
        REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_courseId_fkey" FOREIGN KEY ("courseId")
        REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE "ImportJob"
  ADD CONSTRAINT "ImportJob_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
CREATE INDEX "Enrollment_importJobId_idx" ON "Enrollment" ("importJobId");
CREATE INDEX "Session_courseId_idx" ON "Session" ("courseId");
CREATE INDEX "Attendance_sessionId_idx" ON "Attendance" ("sessionId");
CREATE INDEX "Attendance_enrollmentId_idx" ON "Attendance" ("enrollmentId");
CREATE INDEX "Attendance_importJobId_idx" ON "Attendance" ("importJobId");
CREATE INDEX "Grade_enrollmentId_idx" ON "Grade" ("enrollmentId");
CREATE INDEX "Grade_evaluationSchemeId_idx" ON "Grade" ("evaluationSchemeId");
CREATE INDEX "Grade_importJobId_idx" ON "Grade" ("importJobId");
CREATE INDEX "Document_providerId_idx" ON "Document" ("providerId");
CREATE INDEX "Document_courseId_idx" ON "Document" ("courseId");
CREATE INDEX "Document_createdById_idx" ON "Document" ("createdById");
CREATE INDEX "ImportJob_providerId_idx" ON "ImportJob" ("providerId");
CREATE INDEX "ImportJob_courseId_idx" ON "ImportJob" ("courseId");
CREATE INDEX "ImportJob_documentId_idx" ON "ImportJob" ("documentId");
CREATE INDEX "ImportJob_createdById_idx" ON "ImportJob" ("createdById");
