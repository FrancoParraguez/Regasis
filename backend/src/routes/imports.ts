import { Router } from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";

import { requireRole } from "../middleware/auth.js";
import { parseCsv } from "../utils/csv.js";

const prisma = new PrismaClient();
const router = Router();
const upload = multer();

const TEMPLATE_CONTENT = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8" />
<!--[if gte mso 9]><xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Plantilla</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml><![endif]-->
<style>
table { border-collapse: collapse; }
td, th { border: 1px solid #999; padding: 4px; }
th { background: #f0f0f0; }
</style>
</head>
<body>
<table>
 <thead>
  <tr>
   <th>email</th>
   <th>nombre</th>
   <th>apellido</th>
   <th>documento</th>
   <th>proveedor</th>
   <th>codigo_curso</th>
   <th>rol_en_curso</th>
  </tr>
 </thead>
 <tbody>
  <tr>
   <td>participante@org.test</td>
   <td>Ana</td>
   <td>Pérez</td>
   <td>12345678</td>
   <td>Proveedor Demo</td>
   <td>CUR-001</td>
   <td>Alumno</td>
  </tr>
 </tbody>
</table>
</body>
</html>`;

router.post("/participantes", requireRole("ADMIN"), upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Archivo requerido" });
  }

  const rows = await parseCsv(req.file.buffer);
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  const requiredFields = ["email", "nombre", "proveedor", "codigo_curso"] as const;

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
        create: { name: providerName },
      });

      const course = await prisma.course.findUnique({
        where: { code: courseCode },
      });

      if (!course) {
        throw new Error(`Curso ${courseCode} no existe`);
      }

      const firstName = row.nombre.trim();
      const lastName = typeof row.apellido === "string" ? row.apellido.trim() : "";
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

  res.json({ created, updated, errors, total: rows.length });
});

router.get("/participantes/plantilla", requireRole("ADMIN"), (_req, res) => {
  const buffer = Buffer.from(TEMPLATE_CONTENT, "utf8");
  res.setHeader("Content-Type", "application/vnd.ms-excel");
  res.setHeader("Content-Disposition", "attachment; filename=plantilla_regasis.xls");
  res.setHeader("Content-Length", buffer.length.toString());
  res.send(buffer);
});

export default router;
