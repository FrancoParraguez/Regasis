import { Router } from "express";
import { requireRole } from "../middleware/auth.js";
import { reportAsistencia, reportCalificaciones } from "../services/report.js";
const router = Router();

router.get("/asistencia", requireRole("REPORTER", "ADMIN"), async (req: any, res) => {
  const providerId = req.user.role === "REPORTER" ? req.user.providerId : (req.query.providerId as string | undefined);
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const data = await reportAsistencia({ providerId, from, to });
  res.json(data);
});
router.get("/calificaciones", requireRole("REPORTER", "ADMIN"), async (req: any, res) => {
  const providerId = req.user.role === "REPORTER" ? req.user.providerId : (req.query.providerId as string | undefined);
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const data = await reportCalificaciones({ providerId, from, to });
  res.json(data);
});
export default router;
