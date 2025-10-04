import { Router, type Request, type Response, type NextFunction } from "express";
import { requireRole } from "../middleware/auth.js";
import type { AttendanceState } from "../types/attendance.js";
import { findAttendanceBySession, upsertAttendance } from "../database/attendance.js";
import { isDatabaseUnavailable } from "../utils/database.js";

const router = Router();

type AttendanceParams = { sessionId: string };

interface AttendancePayloadItem {
  enrollmentId: string;
  state: AttendanceState;
  observation?: string;
}

interface AttendancePayload {
  items?: AttendancePayloadItem[];
}

router.get(
  "/session/:sessionId",
  requireRole("INSTRUCTOR", "ADMIN"),
  async (req: Request<AttendanceParams>, res: Response, next: NextFunction) => {
    try {
      const data = await findAttendanceBySession(req.params.sessionId);
      return res.json(data);
    } catch (error) {
      if (isDatabaseUnavailable(error)) {
        return res.status(503).json({ error: "No se pudo obtener la asistencia" });
      }
      return next(error);
    }
  }
);

router.post(
  "/session/:sessionId",
  requireRole("INSTRUCTOR", "ADMIN"),
  async (req: Request<AttendanceParams, unknown, AttendancePayload>, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const sessionId = req.params.sessionId;
    const items = req.body?.items ?? [];

    try {
      await Promise.all(
        items.map((item) =>
          upsertAttendance({
            sessionId,
            enrollmentId: item.enrollmentId,
            state: item.state,
            observation: item.observation,
            updatedById: userId
          })
        )
      );
      return res.json({ updated: items.length });
    } catch (error) {
      if (isDatabaseUnavailable(error)) {
        return res.status(503).json({ error: "No se pudo registrar la asistencia" });
      }
      return next(error);
    }
  }
);

export default router;
