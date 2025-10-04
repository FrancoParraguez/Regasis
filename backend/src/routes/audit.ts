import { Router, type Request, type Response, type NextFunction } from "express";
import { requireRole } from "../middleware/auth.js";
import { listAuditLogs } from "../database/audit.js";
import { isDatabaseUnavailable } from "../utils/database.js";

const router = Router();

router.get(
  "/",
  requireRole("ADMIN"),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await listAuditLogs(200);
      res.json(logs);
    } catch (error) {
      if (isDatabaseUnavailable(error)) {
        return res.status(503).json({ error: "Servicio de auditoría no disponible" });
      }
      next(error);
    }
  }
);

export default router;
