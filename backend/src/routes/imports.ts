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
