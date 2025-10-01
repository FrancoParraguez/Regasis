import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "../middleware/auth.js";
const prisma = new PrismaClient();
const router = Router();

router.get("/mias", requireRole("INSTRUCTOR"), async (req: any, res) => {
  const userId = req.user.id;
  const sessions = await prisma.session.findMany({
    where: { course: { instructors: { some: { userId } } } },
    include: { course: true }
  });
  res.json(sessions);
});
router.post("/", requireRole("INSTRUCTOR", "ADMIN"), async (req: any, res) => {
  const { courseId, date } = req.body;
  const s = await prisma.session.create({ data: { courseId, date: new Date(date) } });
  res.status(201).json(s);
});
export default router;
