import { Router, type Request, type Response, type NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "../middleware/auth.js";
import { listDemoSessions, createDemoSession } from "../services/demo-data.js";
import { isPrismaUnavailable } from "../utils/prisma.js";

const prisma = new PrismaClient();
const router = Router();

router.get(
  "/mias",
  requireRole("INSTRUCTOR", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;
    const userId = user.id;
    try {
      const sessions = await prisma.session.findMany({
        where: { course: { instructors: { some: { userId } } } },
        include: { course: true }
      });
      return res.json(sessions);
    } catch (error) {
      if (!isPrismaUnavailable(error)) return next(error);
      return res.json(listDemoSessions(userId));
    }
  }
);

interface SessionBody {
  courseId: string;
  date: string;
}

router.post(
  "/",
  requireRole("INSTRUCTOR", "ADMIN"),
  async (req: Request<unknown, unknown, SessionBody>, res: Response, next: NextFunction) => {
    const { courseId, date } = req.body;

    try {
      const session = await prisma.session.create({
        data: { courseId, date: new Date(date) }
      });
      return res.status(201).json(session);
    } catch (error) {
      if (!isPrismaUnavailable(error)) return next(error);

      try {
        const session = createDemoSession({ courseId, date });
        return res.status(201).json(session);
      } catch (creationError) {
        if (creationError instanceof Error && creationError.message === "Curso no encontrado") {
          return res.status(404).json({ error: creationError.message });
        }
        return next(creationError);
      }
    }
  }
);

export default router;
