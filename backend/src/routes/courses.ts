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
