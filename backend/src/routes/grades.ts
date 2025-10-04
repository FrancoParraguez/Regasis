import { Router, type Request, type Response, type NextFunction } from "express";
import { requireRole } from "../middleware/auth.js";
import type { GradeType } from "../types/grades.js";
import { listGradesByCourse, createGrade } from "../database/grades.js";
import { isDatabaseUnavailable } from "../utils/database.js";

const router = Router();

type CourseParams = { courseId: string };

interface CreateGradePayload {
  enrollmentId: string;
  type: GradeType;
  score: number;
  date?: string;
  evaluationSchemeId?: string;
  observation?: string;
}

router.get(
  "/course/:courseId",
  requireRole("INSTRUCTOR", "ADMIN"),
  async (req: Request<CourseParams>, res: Response, next: NextFunction) => {
    try {
      const grades = await listGradesByCourse(req.params.courseId);
      return res.json(grades);
    } catch (error) {
      if (isDatabaseUnavailable(error)) {
        return res.status(503).json({ error: "No se pudieron obtener las calificaciones" });
      }
      return next(error);
    }
  }
);

router.post(
  "/",
  requireRole("INSTRUCTOR", "ADMIN"),
  async (req: Request<unknown, unknown, CreateGradePayload>, res: Response, next: NextFunction) => {
    const { enrollmentId, type, score, date, evaluationSchemeId, observation } = req.body;
    try {
      const grade = await createGrade({
        enrollmentId,
        type,
        score,
        date: date ? new Date(date) : undefined,
        evaluationSchemeId,
        observation
      });
      return res.status(201).json(grade);
    } catch (error) {
      if (isDatabaseUnavailable(error)) {
        return res.status(503).json({ error: "No se pudo registrar la calificación" });
      }
      return next(error);
    }
  }
);

export default router;
