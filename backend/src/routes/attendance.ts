import { Router, type Request, type Response } from "express";
import { PrismaClient, type AttendanceState } from "@prisma/client";
import { requireRole } from "../middleware/auth.js";

const prisma = new PrismaClient();
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
  async (req: Request<AttendanceParams>, res: Response) => {
    const data = await prisma.attendance.findMany({
      where: { sessionId: req.params.sessionId },
      include: { enrollment: { include: { participant: true, course: true } } }
    });

    return res.json(data);
  }
);

router.post(
  "/session/:sessionId",
  requireRole("INSTRUCTOR", "ADMIN"),
  async (req: Request<AttendanceParams, unknown, AttendancePayload>, res: Response) => {
    const userId = req.user!.id;
    const sessionId = req.params.sessionId;
    const items = req.body?.items ?? [];

    const updates = await Promise.all(
      items.map((item) =>
        prisma.attendance.upsert({
          where: { sessionId_enrollmentId: { sessionId, enrollmentId: item.enrollmentId } },
          update: { state: item.state, observation: item.observation, updatedById: userId },
          create: {
            sessionId,
            enrollmentId: item.enrollmentId,
            state: item.state,
            observation: item.observation,
            updatedById: userId
          }
        })
      )
    );

    return res.json({ updated: updates.length });
  }
);

export default router;
