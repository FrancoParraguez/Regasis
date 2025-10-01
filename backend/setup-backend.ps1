# setup-backend.ps1
$ErrorActionPreference = "Stop"

function Write-File($Path, $Content) {
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $Content | Set-Content -Path $Path -Encoding UTF8
}

$dirs = @(
  "prisma",
  "src",
  "src\config",
  "src\utils",
  "src\types",
  "src\middleware",
  "src\routes",
  "src\services"
)
$dirs | ForEach-Object { New-Item -ItemType Directory -Force -Path $_ | Out-Null }

# ---- .env.example
$envex = @'
PORT=4000
NODE_ENV=production
JWT_SECRET=supersecret_prod_change
JWT_EXPIRES=8h
REFRESH_EXPIRES=7d
CORS_ORIGIN=http://localhost:5173
DATABASE_URL="postgresql://app:app@localhost:5432/reinsercion?schema=public"
'@
Write-File ".env.example" $envex

# ---- package.json
$pkg = @'
{
  "name": "control-asistencia-reinsercion-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev --name init",
    "prisma:studio": "prisma studio",
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.19.0",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "csv-parse": "^5.5.6",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/morgan": "^1.9.7",
    "@types/multer": "^1.4.12",
    "prisma": "^5.19.0",
    "ts-node": "^10.9.2",
    "tslib": "^2.7.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.2"
  }
}
'@
Write-File "package.json" $pkg

# ---- tsconfig.json
$tscfg = @'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src", "prisma/seed.ts"]
}
'@
Write-File "tsconfig.json" $tscfg

# ---- prisma/schema.prisma
$schema = @'
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role { ADMIN INSTRUCTOR REPORTER }
enum AttendanceState { PRESENTE AUSENTE JUSTIFICADO }
enum GradeType { P1 P2 EXAMEN PRACTICA OTRO }

model Provider {
  id        String   @id @default(cuid())
  name      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  users     User[]
  courses   Course[]
}
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String
  password    String
  role        Role
  providerId  String?
  provider    Provider? @relation(fields: [providerId], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  instructorOf CourseInstructor[]
  auditLogs   AuditLog[]
  refreshTokens RefreshToken[]
}
model Course {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  startDate   DateTime
  endDate     DateTime
  providerId  String
  provider    Provider @relation(fields: [providerId], references: [id])
  instructors CourseInstructor[]
  sessions    Session[]
  enrollments Enrollment[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
model CourseInstructor {
  id        String @id @default(cuid())
  courseId  String
  userId    String
  course    Course @relation(fields: [courseId], references: [id])
  user      User   @relation(fields: [userId], references: [id])
  @@unique([courseId, userId])
}
model Participant {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  providerId String?
  provider  Provider? @relation(fields: [providerId], references: [id])
  enrollments Enrollment[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
model Enrollment {
  id            String @id @default(cuid())
  participantId String
  courseId      String
  participant   Participant @relation(fields: [participantId], references: [id])
  course        Course      @relation(fields: [courseId], references: [id])
  createdAt     DateTime @default(now())
  @@unique([participantId, courseId])
}
model Session {
  id        String   @id @default(cuid())
  courseId  String
  date      DateTime
  course    Course   @relation(fields: [courseId], references: [id])
  attendance Attendance[]
}
model Attendance {
  id            String @id @default(cuid())
  sessionId     String
  enrollmentId  String
  state         AttendanceState
  observation   String?
  session       Session     @relation(fields: [sessionId], references: [id])
  enrollment    Enrollment  @relation(fields: [enrollmentId], references: [id])
  updatedById   String?
  updatedBy     User?       @relation(fields: [updatedById], references: [id])
  updatedAt     DateTime    @updatedAt
  createdAt     DateTime    @default(now())
  @@unique([sessionId, enrollmentId])
}
model Grade {
  id            String @id @default(cuid())
  enrollmentId  String
  type          GradeType
  score         Float
  date          DateTime @default(now())
  enrollment    Enrollment @relation(fields: [enrollmentId], references: [id])
}
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  action    String
  method    String
  path      String
  status    Int
  ip        String?
  metadata  Json?
  createdAt DateTime @default(now())
}
model RefreshToken {
  id        String   @id @default(cuid())
  jti       String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  revoked   Boolean  @default(false)
  createdAt DateTime @default(now())
}
'@
Write-File "prisma\schema.prisma" $schema

# ---- prisma/seed.ts
$seed = @'
import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/utils/crypto.js";
const prisma = new PrismaClient();

async function main(){
  const provider = await prisma.provider.upsert({
    where: { name: "ACME Capacitación" },
    update: {},
    create: { name: "ACME Capacitación" }
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
'@
Write-File "prisma\seed.ts" $seed

# ---- src/config/env.ts
$envts = @'
import * as dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "changeme",
  JWT_EXPIRES: process.env.JWT_EXPIRES || "8h",
  REFRESH_EXPIRES: process.env.REFRESH_EXPIRES || "7d",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  DATABASE_URL: process.env.DATABASE_URL!
};
'@
Write-File "src\config\env.ts" $envts

# ---- utils
$crypto = @'
import bcrypt from "bcrypt";
export async function hashPassword(pw: string){ return bcrypt.hash(pw, 10); }
export async function comparePassword(pw: string, hash: string){ return bcrypt.compare(pw, hash); }
'@
Write-File "src\utils\crypto.ts" $crypto

$csv = @'
import { parse } from "csv-parse";
export async function parseCsv(buffer: Buffer): Promise<Record<string,string>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string,string>[] = [];
    const parser = parse({ columns: true, skip_empty_lines: true, trim: true });
    parser.on("readable", () => {
      let record; while ((record = parser.read()) !== null) rows.push(record);
    });
    parser.on("error", reject);
    parser.on("end", () => resolve(rows));
    parser.write(buffer); parser.end();
  });
}
'@
Write-File "src\utils\csv.ts" $csv

$jwtutil = @'
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";
export function signAccessToken(payload: object, subject: string){
  return jwt.sign(payload, env.JWT_SECRET, { subject, expiresIn: env.JWT_EXPIRES });
}
export function newJti(){ return crypto.randomUUID(); }
'@
Write-File "src\utils\jwt.ts" $jwtutil

# ---- types/express.d.ts
$types = @'
import "express";
declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; role: "ADMIN"|"INSTRUCTOR"|"REPORTER"; providerId?: string|null };
  }
}
export {};
'@
Write-File "src\types\express.d.ts" $types

# ---- middlewares
$authmw = @'
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function auth(required = true){
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : undefined;
    if(!token){
      if(!required) return next();
      return res.status(401).json({ error: "No token" });
    }
    try{
      const payload = jwt.verify(token, env.JWT_SECRET) as any;
      (req as any).user = { id: payload.sub, role: payload.role, providerId: payload.providerId };
      next();
    }catch{
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}
export function requireRole(...roles: ("ADMIN"|"INSTRUCTOR"|"REPORTER")[]){
  return (req: any, res: any, next: NextFunction) => {
    if(!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
'@
Write-File "src\middleware\auth.ts" $authmw

$audmw = @'
import { PrismaClient } from "@prisma/client";
import type { Request, Response, NextFunction } from "express";
const prisma = new PrismaClient();

export async function audit(req: Request, res: Response, next: NextFunction){
  const start = Date.now();
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress || undefined;
  const userId = (req as any).user?.id as string | undefined;

  res.on("finish", async () => {
    try{
      await prisma.auditLog.create({ data: {
        userId, action: `${req.method} ${req.path}`, method: req.method, path: req.path,
        status: res.statusCode, ip, metadata: { ms: Date.now() - start }
      }});
    }catch{}
  });
  next();
}
'@
Write-File "src\middleware\audit.ts" $audmw

$errmw = @'
import type { NextFunction, Request, Response } from "express";
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction){
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Server error" });
}
'@
Write-File "src\middleware\error.ts" $errmw

# ---- routes index
$routesIndex = @'
import { Router } from "express";
import authRouter from "./auth.js";
import coursesRouter from "./courses.js";
import sessionsRouter from "./sessions.js";
import attendanceRouter from "./attendance.js";
import gradesRouter from "./grades.js";
import reportsRouter from "./reports.js";
import importsRouter from "./imports.js";
import auditRouter from "./audit.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use("/auth", auth(false), authRouter);
router.use("/cursos", auth(), coursesRouter);
router.use("/sesiones", auth(), sessionsRouter);
router.use("/asistencias", auth(), attendanceRouter);
router.use("/notas", auth(), gradesRouter);
router.use("/reportes", auth(), reportsRouter);
router.use("/importaciones", auth(), importsRouter);
router.use("/auditoria", auth(), auditRouter);
export default router;
'@
Write-File "src\routes\index.ts" $routesIndex

$authRoute = @'
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { comparePassword } from "../utils/crypto.js";
import { env } from "../config/env.js";
import { signAccessToken, newJti } from "../utils/jwt.js";
const prisma = new PrismaClient();
const router = Router();

function addDuration(base: Date, duration: string){
  const d = new Date(base);
  const m = duration.match(/(\d+)([smhdw])/i);
  const n = m ? parseInt(m[1],10) : 7;
  const u = m ? m[2].toLowerCase() : 'd';
  const mult: Record<string, number> = { s:1e3, m:6e4, h:36e5, d:864e5, w:6048e5 };
  d.setTime(d.getTime() + n * (mult[u] ?? 864e5));
  return d;
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await prisma.user.findUnique({ where: { email } });
  if(!user) return res.status(401).json({ error: "Credenciales inválidas" });
  const ok = await comparePassword(password, user.password);
  if(!ok) return res.status(401).json({ error: "Credenciales inválidas" });

  const accessToken = signAccessToken({ role: user.role, providerId: user.providerId }, user.id);
  const jti = newJti();
  const expiresAt = addDuration(new Date(), env.REFRESH_EXPIRES);
  await prisma.refreshToken.create({ data: { jti, userId: user.id, expiresAt } });

  res.json({
    token: accessToken,
    refreshToken: jti,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, providerId: user.providerId }
  });
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken: string };
  if(!refreshToken) return res.status(400).json({ error: "refreshToken requerido" });
  const rt = await prisma.refreshToken.findUnique({ where: { jti: refreshToken }, include: { user: true } });
  if(!rt || rt.revoked || rt.expiresAt < new Date()) return res.status(401).json({ error: "refreshToken inválido" });

  await prisma.refreshToken.update({ where: { jti: refreshToken }, data: { revoked: true } });
  const jti = newJti();
  const expiresAt = addDuration(new Date(), env.REFRESH_EXPIRES);
  await prisma.refreshToken.create({ data: { jti, userId: rt.userId, expiresAt } });

  const token = signAccessToken({ role: rt.user.role, providerId: rt.user.providerId }, rt.userId);
  res.json({ token, refreshToken: jti });
});

router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken: string };
  if(refreshToken){
    try{ await prisma.refreshToken.update({ where: { jti: refreshToken }, data: { revoked: true } }); }catch{}
  }
  res.json({ ok: true });
});

export default router;
'@
Write-File "src\routes\auth.ts" $authRoute

$coursesRoute = @'
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "../middleware/auth.js";
const prisma = new PrismaClient();
const router = Router();

router.get("/", requireRole("ADMIN"), async (_req: any, res) => {
  const courses = await prisma.course.findMany({ include: { instructors: { include: { user: true } }, provider: true } });
  res.json(courses);
});
router.post("/", requireRole("ADMIN"), async (req: any, res) => {
  const { code, name, startDate, endDate, providerId, instructorIds } = req.body;
  const c = await prisma.course.create({ data: {
    code, name,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    providerId,
    instructors: { create: (instructorIds||[]).map((id:string)=>({ userId: id })) }
  }});
  res.status(201).json(c);
});
router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  await prisma.course.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
router.get("/mios", requireRole("INSTRUCTOR", "ADMIN"), async (req: any, res) => {
  const userId = req.user.id;
  const where = req.user.role === "INSTRUCTOR" ? { instructors: { some: { userId } } } : {};
  const courses = await prisma.course.findMany({ where, select: { id: true, code: true, name: true, startDate: true, endDate: true } });
  res.json(courses);
});
export default router;
'@
Write-File "src\routes\courses.ts" $coursesRoute

$sessionsRoute = @'
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "../middleware/auth.js";
const prisma = new PrismaClient();
const router = Router();

router.get("/mias", requireRole("INSTRUCTOR"), async (req: any, res) => {
  const userId = req.user.id;
  const sessions = await prisma.session.findMany({
    where: { course: { instructors: { some: { userId } } } },
    include: { course: true }
  });
  res.json(sessions);
});
router.post("/", requireRole("INSTRUCTOR", "ADMIN"), async (req: any, res) => {
  const { courseId, date } = req.body;
  const s = await prisma.session.create({ data: { courseId, date: new Date(date) } });
  res.status(201).json(s);
});
export default router;
'@
Write-File "src\routes\sessions.ts" $sessionsRoute

$attendanceRoute = @'
import { Router } from "express";
import { PrismaClient, AttendanceState } from "@prisma/client";
import { requireRole } from "../middleware/auth.js";
const prisma = new PrismaClient();
const router = Router();

router.get("/session/:sessionId", requireRole("INSTRUCTOR", "ADMIN"), async (req, res) => {
  const data = await prisma.attendance.findMany({
    where: { sessionId: req.params.sessionId },
    include: { enrollment: { include: { participant: true, course: true } } }
  });
  res.json(data);
});

router.post("/session/:sessionId", requireRole("INSTRUCTOR", "ADMIN"), async (req: any, res) => {
  const userId = req.user.id as string;
  const sessionId = req.params.sessionId;
  const items = req.body.items as { enrollmentId: string; state: AttendanceState; observation?: string }[];
  const updates = await Promise.all(items.map(i => prisma.attendance.upsert({
    where: { sessionId_enrollmentId: { sessionId, enrollmentId: i.enrollmentId } },
    update: { state: i.state, observation: i.observation, updatedById: userId },
    create: { sessionId, enrollmentId: i.enrollmentId, state: i.state, observation: i.observation, updatedById: userId }
  })));
  res.json({ updated: updates.length });
});
export default router;
'@
Write-File "src\routes\attendance.ts" $attendanceRoute

$gradesRoute = @'
import { Router } from "express";
import { PrismaClient, GradeType } from "@prisma/client";
import { requireRole } from "../middleware/auth.js";
const prisma = new PrismaClient();
const router = Router();

router.get("/course/:courseId", requireRole("INSTRUCTOR", "ADMIN"), async (req, res) => {
  const grades = await prisma.grade.findMany({
    where: { enrollment: { courseId: req.params.courseId } },
    include: { enrollment: { include: { participant: true } } }
  });
  res.json(grades);
});
router.post("/", requireRole("INSTRUCTOR", "ADMIN"), async (req, res) => {
  const { enrollmentId, type, score, date } = req.body as { enrollmentId: string; type: GradeType; score: number; date?: string };
  const g = await prisma.grade.create({ data: { enrollmentId, type, score, date: date? new Date(date): undefined } });
  res.status(201).json(g);
});
export default router;
'@
Write-File "src\routes\grades.ts" $gradesRoute

$reportSvc = @'
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
      enrollment: { include: { participant: true, course: true } }
    }
  });
}
'@
Write-File "src\services\report.ts" $reportSvc

$reportsRoute = @'
import { Router } from "express";
import { requireRole } from "../middleware/auth.js";
import { reportAsistencia, reportCalificaciones } from "../services/report.js";
const router = Router();

router.get("/asistencia", requireRole("REPORTER", "ADMIN"), async (req: any, res) => {
  const providerId = req.user.role === "REPORTER" ? req.user.providerId : (req.query.providerId as string | undefined);
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const data = await reportAsistencia({ providerId, from, to });
  res.json(data);
});
router.get("/calificaciones", requireRole("REPORTER", "ADMIN"), async (req: any, res) => {
  const providerId = req.user.role === "REPORTER" ? req.user.providerId : (req.query.providerId as string | undefined);
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const data = await reportCalificaciones({ providerId, from, to });
  res.json(data);
});
export default router;
'@
Write-File "src\routes\reports.ts" $reportsRoute

$importsRoute = @'
import { Router } from "express";
import multer from "multer";
import { parseCsv } from "../utils/csv.js";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "../middleware/auth.js";
const prisma = new PrismaClient();
const router = Router();
const upload = multer();

router.post("/participantes", requireRole("ADMIN"), upload.single("file"), async (req, res) => {
  if(!req.file) return res.status(400).json({ error: "Archivo requerido" });
  const rows = await parseCsv(req.file.buffer);
  let created = 0, updated = 0, errors: string[] = [];

  for(const [idx, r] of rows.entries()){
    try{
      const provider = await prisma.provider.upsert({ where: { name: r.proveedor }, update: {}, create: { name: r.proveedor } });
      const course = await prisma.course.findUnique({ where: { code: r.codigo_curso } });
      if(!course) throw new Error(`Curso ${r.codigo_curso} no existe`);
      const participant = await prisma.participant.upsert({
        where: { email: r.email },
        update: { name: r.nombre, providerId: provider.id },
        create: { email: r.email, name: r.nombre, providerId: provider.id }
      });
      const before = await prisma.enrollment.findUnique({ where: { participantId_courseId: { participantId: participant.id, courseId: course.id } } });
      if(before){ updated++; }
      await prisma.enrollment.upsert({
        where: { participantId_courseId: { participantId: participant.id, courseId: course.id } },
        update: {},
        create: { participantId: participant.id, courseId: course.id }
      });
      if(!before) created++;
    }catch(e:any){
      errors.push(`Fila ${idx+1}: ${e.message}`);
    }
  }
  res.json({ created, updated, errors, total: rows.length });
});
export default router;
'@
Write-File "src\routes\imports.ts" $importsRoute

$auditRoute = @'
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "../middleware/auth.js";
const prisma = new PrismaClient();
const router = Router();

router.get("/", requireRole("ADMIN"), async (_req, res) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { user: true } });
  res.json(logs);
});
export default router;
'@
Write-File "src\routes\audit.ts" $auditRoute

# ---- server.ts
$server = @'
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env.js";
import router from "./routes/index.js";
import { audit } from "./middleware/audit.js";
import { errorHandler } from "./middleware/error.js";

const app = express();
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(audit);
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api", router);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API running on http://localhost:${env.PORT}`);
});
'@
Write-File "src\server.ts" $server

Write-Host "✅ Backend generado."
Write-Host "Sigue: cp .env.example .env ; corepack enable ; pnpm i ; pnpm prisma:generate ; pnpm prisma:migrate ; pnpm seed ; pnpm dev"
