import { createHash, randomUUID } from "node:crypto";

import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import type { ImportStatus } from "../types/imports.js";
import { utils, write } from "xlsx";

import { requireRole } from "../middleware/auth.js";
import { parseCsv } from "../utils/csv.js";
import { createDocument, updateDocument } from "../database/documents.js";
import { createImportJob, updateImportJob } from "../database/import-jobs.js";
import { upsertProviderByName } from "../database/providers.js";
import { findCourseByCode } from "../database/courses.js";
import { upsertParticipantByEmail } from "../database/participants.js";
import { findEnrollment, upsertEnrollment } from "../database/enrollments.js";
import { isDatabaseUnavailable } from "../utils/database.js";

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
  "Proveedor Ejemplo",
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
const IMPORT_STATUS: Record<"PROCESSING" | "FAILED" | "COMPLETED", ImportStatus> = {
  PROCESSING: "PROCESSING",
  FAILED: "FAILED",
  COMPLETED: "COMPLETED"
};

router.post(
  "/participantes",
  requireRole("ADMIN"),
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) return res.status(400).json({ error: "Archivo requerido" });

    const user = req.user!;
    const rows = await parseCsv(req.file.buffer, req.file.mimetype);
    const checksum = createHash("sha256").update(req.file.buffer).digest("hex");
    const generatedName = randomUUID();
    const metadata: Record<string, unknown> = {
      fieldname: req.file.fieldname ?? "file",
      encoding: req.file.encoding ?? "",
      totalRows: rows.length
    };

    try {
      const document = await createDocument({
        filename: generatedName,
        originalName: req.file.originalname || generatedName,
        mimeType: req.file.mimetype || "application/octet-stream",
        size: req.file.size,
        checksum,
        metadata,
        createdById: user.id
      });

      const importJob = await createImportJob({
        kind: PARTICIPANT_IMPORT_KIND,
        status: IMPORT_STATUS.PROCESSING,
        documentId: document.id,
        createdById: user.id,
        totalRows: rows.length,
        startedAt: new Date()
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

            const provider = await upsertProviderByName(providerName);
            providerIds.add(provider.id);

            const course = await findCourseByCode(courseCode);
            if (!course) throw new Error(`Curso ${courseCode} no existe`);
            courseIds.add(course.id);

            const firstName = row.nombre.trim();
            const lastName = typeof row.apellido === "string" ? row.apellido.trim() : "";
            const fullName = lastName ? `${firstName} ${lastName}` : firstName;

            const participant = await upsertParticipantByEmail({
              email,
              name: fullName,
              providerId: provider.id
            });

            const before = await findEnrollment(participant.id, course.id);

            if (before) updated += 1;

            const role = typeof row.rol_en_curso === "string" ? row.rol_en_curso.trim() : undefined;

            await upsertEnrollment({
              participantId: participant.id,
              courseId: course.id,
              role: role || undefined,
              importJobId: importJob.id
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
      };

      if (fatalError) {
        const message =
          fatalError instanceof Error
            ? fatalError.message
            : "Error inesperado durante la importación";
        const failureUpdate: Parameters<typeof updateImportJob>[1] = {
          ...baseUpdate,
          status: IMPORT_STATUS.FAILED,
          failureCount: errors.length + 1,
          errorMessage: message
        };
        if (providerIdForJob !== undefined) failureUpdate.providerId = providerIdForJob;
        if (courseIdForJob !== undefined) failureUpdate.courseId = courseIdForJob;
        await updateImportJob(importJob.id, failureUpdate);

        if (providerIdForJob !== undefined || courseIdForJob !== undefined) {
          await updateDocument(document.id, {
            providerId: providerIdForJob,
            courseId: courseIdForJob
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

      const successUpdate: Parameters<typeof updateImportJob>[1] = {
        ...baseUpdate,
        status: IMPORT_STATUS.COMPLETED,
        errorMessage: errors.length ? errors.join("\n") : null
      };
      if (providerIdForJob !== undefined) successUpdate.providerId = providerIdForJob;
      if (courseIdForJob !== undefined) successUpdate.courseId = courseIdForJob;
      await updateImportJob(importJob.id, successUpdate);

      if (providerIdForJob !== undefined || courseIdForJob !== undefined) {
        await updateDocument(document.id, {
          providerId: providerIdForJob,
          courseId: courseIdForJob
        });
      }

      return res.json({ created, updated, errors, total: rows.length, importJobId: importJob.id });
    } catch (error) {
      if (isDatabaseUnavailable(error)) {
        return res.status(503).json({ error: "No se pudo procesar la importación" });
      }
      return next(error);
    }
  }
);

router.get(
  "/participantes/plantilla",
  requireRole("ADMIN"),
  (_req: Request, res: Response) => {
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=plantilla_regasis.xlsx");
    res.setHeader("Content-Length", TEMPLATE_BUFFER.length.toString());
    res.send(TEMPLATE_BUFFER);
  }
);

export default router;
