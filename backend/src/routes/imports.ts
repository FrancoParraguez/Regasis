import { createHash, randomUUID } from "node:crypto";

import { Router } from "express";
import multer from "multer";
import { PrismaClient, ImportStatus, Prisma } from "@prisma/client";
import { utils, write } from "xlsx";

import { requireRole } from "../middleware/auth.js";
import { parseCsv } from "../utils/csv.js";

const prisma = new PrismaClient();
const router = Router();
const upload = multer();

const TEMPLATE_HEADER = [
  "email",
  "nombre",
  "apellido",
  "documento",
  "proveedor",
  "codigo_curso",
  "rol_en_curso"
] as const;

const TEMPLATE_SAMPLE_ROW = [
  "participante@org.test",
  "Ana",
  "Pérez",
  "12345678",
  "Proveedor Demo",
  "CUR-001",
  "Alumno"
];

const TEMPLATE_COLUMN_WIDTHS = [28, 18, 18, 14, 22, 16, 16];

function createTemplateWorkbook(): Buffer {
  const workbook = utils.book_new();
  const sheet = utils.aoa_to_sheet([
    [...TEMPLATE_HEADER],
    [...TEMPLATE_SAMPLE_ROW]
  ]);

  // set column widths
  sheet["!cols"] = TEMPLATE_COLUMN_WIDTHS.map((width) => ({ wch: width }));
  utils.book_append_sheet(workbook, sheet, "Plantilla");

  const createdAt = new Date();
  workbook.Props = {
    Title: "Plantilla participantes",
    Subject: "Importaciones Regasis",
    Author: "Regasis",
    LastAuthor: "Regasis",
    Company: "Regasis",
    CreatedDate: createdAt
  };

  const buffer = write(workbook, { bookType: "xlsx", type: "buffer" });
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

const TEMPLATE_BUFFER = createTemplateWorkbook();

const PARTICIPANT_IMPORT_KIND = "PARTICIPANT_ENROLLMENT";

router.post("/participantes", requireRole("ADMIN"), upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Archivo requerido" });

  const user = req.user!;
  const rows = await parseCsv(req.file.buffer, req.file.mimetype);
  const checksum = createHash("sha256").update(req.file.buffer).digest("hex");
  const generatedName = randomUUID();
  const metadata: Prisma.JsonObject = {
    fieldname: req.file.fieldname ?? "file",
    encoding: req.file.encoding ?? "",
    totalRows: rows.length
  };

  const document = await prisma.document.create({
    data: {
      filename: generatedName,
      originalName: req.file.originalname || generatedName,
      mimeType: req.file.mimetype || "application/octet-stream",
      size: req.file.size,
      checksum,
      metadata,
      createdById: user.id
    }
  });

  const importJob = await prisma.importJob.create({
    data: {
      kind: PARTICIPANT_IMPORT_KIND,
      status: ImportStatus.PROCESSING,
      documentId: document.id,
      createdById: user.id,
      totalRows: rows.length,
      startedAt: new Date()
    }
  });

  let created = 0;
  let updated = 0;
  const errors: string[] = [];
  const providerIds = new Set<string>();
  const courseIds = new Set<string>();

  const requiredFields = ["email", "nombre", "proveedor", "codigo_curso"] as const;

  let fatalError: unknown;

  try {
    for (const [idx, row] of rows.entries()) {
      try {
        const missingFields = requiredFields.filter((field) => {
          const value = row[field];
          return typeof value !== "string" || value.trim().length === 0;
        });
        if (missingFields.length > 0) {
          throw new Error(`Faltan datos obligatorios (${missingFields.join(", ")})`);
        }

        const email = row.email.trim();
        const providerName = row.proveedor.trim();
        const courseCode = row.codigo_curso.trim();

        const provider = await prisma.provider.upsert({
          where: { name: providerName },
          update: {},
          create: { name: providerName }
        });
        providerIds.add(provider.id);

        const course = await prisma.course.findUnique({ where: { code: courseCode } });
        if (!course) throw new Error(`Curso ${courseCode} no existe`);
        courseIds.add(course.id);

        const firstName = row.nombre.trim();
        const lastName = typeof row.apellido === "string" ? row.apellido.trim() : "";
        const fullName = lastName ? `${firstName} ${lastName}` : firstName;

        const participant = await prisma.participant.upsert({
          where: { email },
          update: { name: fullName, providerId: provider.id },
          create: { email, name: fullName, providerId: provider.id }
        });

        const before = await prisma.enrollment.findUnique({
          where: { participantId_courseId: { participantId: participant.id, courseId: course.id } }
        });

        if (before) updated += 1;

        const role = typeof row.rol_en_curso === "string" ? row.rol_en_curso.trim() : undefined;

        await prisma.enrollment.upsert({
          where: { participantId_courseId: { participantId: participant.id, courseId: course.id } },
          update: {
            role: role || undefined,
            importJobId: importJob.id
          },
          create: {
            participantId: participant.id,
            courseId: course.id,
            role: role || undefined,
            importJobId: importJob.id
          }
        });

        if (!before) created += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        errors.push(`Fila ${idx + 1}: ${message}`);
      }
    }
  } catch (error) {
    fatalError = error;
  }

  const processedRows = created + updated + errors.length;
  const providerIdForJob = providerIds.size === 1 ? [...providerIds][0] : undefined;
  const courseIdForJob = courseIds.size === 1 ? [...courseIds][0] : undefined;
  const now = new Date();

  const baseUpdate = {
    processedRows,
    successCount: created + updated,
    failureCount: errors.length,
    completedAt: now
  } satisfies Partial<Prisma.ImportJobUpdateInput>;

  if (fatalError) {
    const message =
      fatalError instanceof Error
        ? fatalError.message
        : "Error inesperado durante la importación";
    await prisma.importJob.update({
      where: { id: importJob.id },
      data: {
        ...baseUpdate,
        status: ImportStatus.FAILED,
        providerId: providerIdForJob,
        courseId: courseIdForJob,
        failureCount: errors.length + 1,
        errorMessage: message
      }
    });

    if (providerIdForJob || courseIdForJob) {
      await prisma.document.update({
        where: { id: document.id },
        data: {
          providerId: providerIdForJob,
          courseId: courseIdForJob
        }
      });
    }

    return res.status(500).json({
      error: message,
      created,
      updated,
      errors,
      total: rows.length,
      importJobId: importJob.id
    });
  }

  await prisma.importJob.update({
    where: { id: importJob.id },
    data: {
      ...baseUpdate,
      status: ImportStatus.COMPLETED,
      providerId: providerIdForJob,
      courseId: courseIdForJob,
      errorMessage: errors.length ? errors.join("\n") : undefined
    }
  });

  if (providerIdForJob || courseIdForJob) {
    await prisma.document.update({
      where: { id: document.id },
      data: {
        providerId: providerIdForJob,
        courseId: courseIdForJob
      }
    });
  }

  res.json({ created, updated, errors, total: rows.length, importJobId: importJob.id });
});

router.get("/participantes/plantilla", requireRole("ADMIN"), (_req, res) => {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=plantilla_regasis.xlsx");
  res.setHeader("Content-Length", TEMPLATE_BUFFER.length.toString());
  res.send(TEMPLATE_BUFFER);
});

export default router;
