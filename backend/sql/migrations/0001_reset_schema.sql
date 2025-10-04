-- =========================
-- Limpieza de esquema
-- =========================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SET search_path TO public;

-- =========================
-- ENUMS
-- =========================
CREATE TYPE "Role" AS ENUM ('ADMIN', 'INSTRUCTOR', 'REPORTER');
CREATE TYPE "AttendanceState" AS ENUM ('PRESENTE', 'AUSENTE', 'JUSTIFICADO', 'TARDANZA', 'SALIDA_ANTICIPADA');
CREATE TYPE "GradeType" AS ENUM ('P1', 'P2', 'EXAMEN', 'PRACTICA', 'OTRO');
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- =========================
-- Tablas principales
-- =========================

CREATE TABLE "Provider" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "User" (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password TEXT NOT NULL, -- bcrypt hash
    role "Role" NOT NULL,
    providerId TEXT REFERENCES "Provider"(id) ON DELETE SET NULL,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Participant" (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    providerId TEXT REFERENCES "Provider"(id) ON DELETE CASCADE,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Course" (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    startDate TIMESTAMPTZ NOT NULL,
    endDate TIMESTAMPTZ NOT NULL,
    providerId TEXT NOT NULL REFERENCES "Provider"(id) ON DELETE CASCADE,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CourseInstructor" (
    id TEXT PRIMARY KEY,
    courseId TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
    userId TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    UNIQUE (courseId, userId) -- evita duplicados
);

CREATE TABLE "Enrollment" (
    id TEXT PRIMARY KEY,
    participantId TEXT NOT NULL REFERENCES "Participant"(id) ON DELETE CASCADE,
    courseId TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (participantId, courseId) -- evita inscripciones duplicadas
);

CREATE TABLE "Session" (
    id TEXT PRIMARY KEY,
    courseId TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Attendance" (
    id TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL REFERENCES "Session"(id) ON DELETE CASCADE,
    enrollmentId TEXT NOT NULL REFERENCES "Enrollment"(id) ON DELETE CASCADE,
    state "AttendanceState" NOT NULL,
    observation TEXT,
    updatedById TEXT REFERENCES "User"(id) ON DELETE SET NULL,
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (sessionId, enrollmentId) -- asegura solo un registro por alumno/sesión
);

CREATE TABLE "Grade" (
    id TEXT PRIMARY KEY,
    enrollmentId TEXT NOT NULL REFERENCES "Enrollment"(id) ON DELETE CASCADE,
    type "GradeType" NOT NULL,
    score DOUBLE PRECISION NOT NULL CHECK (score >= 0),
    date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Document" (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    originalName TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    size BIGINT NOT NULL,
    checksum TEXT,
    url TEXT,
    metadata JSONB,
    createdById TEXT NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
    providerId TEXT REFERENCES "Provider"(id) ON DELETE SET NULL,
    courseId TEXT REFERENCES "Course"(id) ON DELETE SET NULL,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ImportJob" (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    status "ImportStatus" NOT NULL,
    providerId TEXT REFERENCES "Provider"(id) ON DELETE SET NULL,
    courseId TEXT REFERENCES "Course"(id) ON DELETE SET NULL,
    documentId TEXT REFERENCES "Document"(id) ON DELETE SET NULL,
    createdById TEXT NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
    totalRows INTEGER NOT NULL DEFAULT 0,
    processedRows INTEGER NOT NULL DEFAULT 0,
    successCount INTEGER NOT NULL DEFAULT 0,
    failureCount INTEGER NOT NULL DEFAULT 0,
    errorMessage TEXT,
    startedAt TIMESTAMPTZ,
    completedAt TIMESTAMPTZ,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RefreshToken" (
    id TEXT PRIMARY KEY,
    jti TEXT NOT NULL UNIQUE,
    userId TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    expiresAt TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AuditLog" (
    id TEXT PRIMARY KEY,
    userId TEXT REFERENCES "User"(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status INTEGER NOT NULL,
    ip TEXT,
    metadata JSONB,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Seguridad: contraseñas
-- =========================

CREATE TABLE "PasswordHistory" (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    password TEXT NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PasswordResetToken" (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expiresAt TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Índices
-- =========================
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_participant_email ON "Participant"(email);
CREATE INDEX idx_course_code ON "Course"(code);

CREATE INDEX idx_document_created_by ON "Document"("createdById");
CREATE INDEX idx_document_provider ON "Document"("providerId");
CREATE INDEX idx_document_course ON "Document"("courseId");
CREATE INDEX idx_document_created_at ON "Document"("createdAt" DESC);

CREATE INDEX idx_enrollment_course ON "Enrollment"(courseId);
CREATE INDEX idx_enrollment_participant ON "Enrollment"(participantId);
CREATE INDEX idx_enrollment_unique ON "Enrollment"(participantId, courseId);

CREATE INDEX idx_attendance_session ON "Attendance"(sessionId);
CREATE INDEX idx_attendance_enrollment ON "Attendance"(enrollmentId);

CREATE INDEX idx_grade_enrollment ON "Grade"(enrollmentId);

CREATE INDEX idx_importjob_status ON "ImportJob"(status);
CREATE INDEX idx_importjob_document ON "ImportJob"("documentId");
CREATE INDEX idx_importjob_created_by ON "ImportJob"("createdById");
CREATE INDEX idx_importjob_created_at ON "ImportJob"("createdAt" DESC);

CREATE INDEX idx_auditlog_user ON "AuditLog"(userId);
CREATE INDEX idx_auditlog_created ON "AuditLog"(createdAt DESC);

CREATE INDEX idx_passwordhistory_user ON "PasswordHistory"(userId);
CREATE INDEX idx_passwordresettoken_user ON "PasswordResetToken"(userId);
CREATE INDEX idx_passwordresettoken_token ON "PasswordResetToken"(token);
CREATE INDEX idx_passwordresettoken_active ON "PasswordResetToken"(expiresAt, used);
