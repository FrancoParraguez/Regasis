import { Router } from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";

import { utils, write } from "xlsx";

import { requireRole } from "../middleware/auth.js";
import { parseImportFile } from "../utils/csv.js";

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
  "rol_en_curso",
] as const;

const TEMPLATE_SAMPLE_ROW = [
  "participante@org.test",
  "Ana",
  "Pérez",
  "12345678",
  "Proveedor Demo",
  "CUR-001",
  "Alumno",
];

const TEMPLATE_COLUMN_WIDTHS = [28, 18, 18, 14, 22, 16, 16];

function createTemplateWorkbook(): Buffer {
  const workbook = utils.book_new();
  const sheet = utils.aoa_to_sheet([TEMPLATE_HEADER, TEMPLATE_SAMPLE_ROW]);

  sheet["!cols"] = TEMPLATE_COLUMN_WIDTHS.map((width) => ({ wch: width }));

  utils.book_append_sheet(workbook, sheet, "Plantilla");

  const createdAt = new Date();
  workbook.Props = {
    Title: "Plantilla participantes",
    Subject: "Importaciones Regasis",
    Author: "Regasis",
    LastAuthor: "Regasis",
    Company: "Regasis",
    CreatedDate: createdAt,
  };

  const buffer = write(workbook, { bookType: "xlsx", type: "buffer" });
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

const TEMPLATE_BUFFER = createTemplateWorkbook();

router.post("/participantes", requireRole("ADMIN"), upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Archivo requerido" });
  }

  const rows = await parseImportFile(req.file.buffer, req.file.mimetype);
  let created = 0;
  let updated = 0;
  const errors: string[] = [];
  let processed = 0;

  const requiredFields = ["email", "nombre", "proveedor", "codigo_curso"] as const;

  for (const [idx, row] of rows.entries()) {
    const normalizedEntries = Object.entries(row).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : "",
    ]);
    const normalizedRow = Object.fromEntries(normalizedEntries) as Record<string, string>;
    const hasData = requiredFields.some((field) => normalizedRow[field]?.length);

    if (!hasData) {
      continue;
    }

    processed += 1;

    try {
      const missingFields = requiredFields.filter((field) => {
        const value = normalizedRow[field];
        return typeof value !== "string" || value.trim().length === 0;
      });

      if (missingFields.length > 0) {
        throw new Error(`Faltan datos obligatorios (${missingFields.join(", ")})`);
      }

      const email = normalizedRow.email.trim();
      const providerName = normalizedRow.proveedor.trim();
      const courseCode = normalizedRow.codigo_curso.trim();
      const provider = await prisma.provider.upsert({
        where: { name: providerName },
        update: {},
        create: { name: providerName },
      });

      const course = await prisma.course.findUnique({
        where: { code: courseCode },
      });

      if (!course) {
        throw new Error(`Curso ${courseCode} no existe`);
      }

      const firstName = normalizedRow.nombre.trim();
      const lastName = typeof normalizedRow.apellido === "string" ? normalizedRow.apellido.trim() : "";
      const fullName = lastName ? `${firstName} ${lastName}` : firstName;
      const participant = await prisma.participant.upsert({
        where: { email },
        update: { name: fullName, providerId: provider.id },
        create: { email, name: fullName, providerId: provider.id },
      });

      const before = await prisma.enrollment.findUnique({
        where: {
          participantId_courseId: {
            participantId: participant.id,
            courseId: course.id,
          },
        },
      });

      if (before) {
        updated += 1;
      }

      await prisma.enrollment.upsert({
        where: {
          participantId_courseId: {
            participantId: participant.id,
            courseId: course.id,
          },
        },
        update: {},
        create: { participantId: participant.id, courseId: course.id },
      });

      if (!before) {
        created += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      errors.push(`Fila ${idx + 1}: ${message}`);
    }
  }

  res.json({ created, updated, errors, total: processed });
});

router.get("/participantes/plantilla", requireRole("ADMIN"), (_req, res) => {
  const buffer = TEMPLATE_BUFFER;
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", "attachment; filename=plantilla_regasis.xlsx");
  res.setHeader("Content-Length", buffer.length.toString());
  res.send(buffer);
});

export default router;
