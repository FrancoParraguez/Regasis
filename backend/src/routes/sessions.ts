import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "../middleware/auth.js";
import { listDemoSessions } from "../services/demo-data.js";
import { isPrismaUnavailable } from "../utils/prisma.js";
const prisma = new PrismaClient();
const router = Router();

router.get("/mias", requireRole("INSTRUCTOR"), async (req: any, res, next) => {
  const userId = req.user.id;
  try{
    const sessions = await prisma.session.findMany({
      where: { course: { instructors: { some: { userId } } } },
      include: { course: true }
    });
    return res.json(sessions);
  }catch(error){
    if(!isPrismaUnavailable(error)) return next(error);
    return res.json(listDemoSessions(userId));
  }
});
router.post("/", requireRole("INSTRUCTOR", "ADMIN"), async (req: any, res) => {
  const { courseId, date } = req.body;
  const s = await prisma.session.create({ data: { courseId, date: new Date(date) } });
  res.status(201).json(s);
});
export default router;
