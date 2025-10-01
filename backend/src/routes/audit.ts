import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "../middleware/auth.js";
const prisma = new PrismaClient();
const router = Router();

router.get("/", requireRole("ADMIN"), async (_req, res) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { user: true } });
  res.json(logs);
});
export default router;
