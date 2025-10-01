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
