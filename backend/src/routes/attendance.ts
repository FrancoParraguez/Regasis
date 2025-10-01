import { Router } from "express";
import { PrismaClient, AttendanceState } from "@prisma/client";
import { requireRole } from "../middleware/auth.js";
const prisma = new PrismaClient();
const router = Router();

router.get("/session/:sessionId", requireRole("INSTRUCTOR", "ADMIN"), async (req, res) => {
  const data = await prisma.attendance.findMany({
    where: { sessionId: req.params.sessionId },
    include: { enrollment: { include: { participant: true, course: true } } }
  });
  res.json(data);
});

router.post("/session/:sessionId", requireRole("INSTRUCTOR", "ADMIN"), async (req: any, res) => {
  const userId = req.user.id as string;
  const sessionId = req.params.sessionId;
  const items = req.body.items as { enrollmentId: string; state: AttendanceState; observation?: string }[];
  const updates = await Promise.all(items.map(i => prisma.attendance.upsert({
    where: { sessionId_enrollmentId: { sessionId, enrollmentId: i.enrollmentId } },
    update: { state: i.state, observation: i.observation, updatedById: userId },
    create: { sessionId, enrollmentId: i.enrollmentId, state: i.state, observation: i.observation, updatedById: userId }
  })));
  res.json({ updated: updates.length });
});
export default router;
