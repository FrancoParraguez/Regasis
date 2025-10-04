import { Router, type Request, type Response, type NextFunction } from "express";
import { requireRole } from "../middleware/auth.js";
import { isDatabaseUnavailable } from "../utils/database.js";
import { listSessionsForInstructor, createSession as createSessionRecord } from "../database/sessions.js";

const router = Router();

router.get(
  "/mias",
  requireRole("INSTRUCTOR", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;
    const userId = user.id;
    try {
      const sessions = await listSessionsForInstructor(userId);
      return res.json(sessions);
    } catch (error) {
      if (isDatabaseUnavailable(error)) {
        return res
          .status(503)
          .json({ error: "La base de datos no está disponible. Intenta nuevamente más tarde." });
      }
      return next(error);
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
      const session = await createSessionRecord({ courseId, date: new Date(date) });
      return res.status(201).json(session);
    } catch (error) {
      if (isDatabaseUnavailable(error)) {
        return res
          .status(503)
          .json({ error: "La base de datos no está disponible. Intenta nuevamente más tarde." });
      }
      return next(error);
    }
  }
);

export default router;
