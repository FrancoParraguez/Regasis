import { Router, type Request, type Response } from "express";
import { PrismaClient, type GradeType } from "@prisma/client";
import { requireRole } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = Router();

type CourseParams = { courseId: string };

interface CreateGradePayload {
  enrollmentId: string;
  type: GradeType;
  score: number;
  date?: string;
}

router.get(
  "/course/:courseId",
  requireRole("INSTRUCTOR", "ADMIN"),
  async (req: Request<CourseParams>, res: Response) => {
    const grades = await prisma.grade.findMany({
      where: { enrollment: { courseId: req.params.courseId } },
      include: { enrollment: { include: { participant: true } } }
    });

    return res.json(grades);
  }
);

router.post(
  "/",
  requireRole("INSTRUCTOR", "ADMIN"),
  async (req: Request<unknown, unknown, CreateGradePayload>, res: Response) => {
    const { enrollmentId, type, score, date } = req.body;
    const grade = await prisma.grade.create({
      data: {
        enrollmentId,
        type,
        score,
        date: date ? new Date(date) : undefined
      }
    });

    return res.status(201).json(grade);
  }
);

export default router;
