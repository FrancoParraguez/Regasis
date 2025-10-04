import type { Request, Response, NextFunction } from "express";
import { insertAuditLog } from "../database/audit.js";
import { isDatabaseUnavailable } from "../utils/database.js";

export async function audit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const start = Date.now();
  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress || undefined;
  const userId = (req as any).user?.id as string | undefined;

  res.on("finish", async () => {
    try {
      await insertAuditLog({
        userId,
        action: `${req.method} ${req.path}`,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ip,
        metadata: { ms: Date.now() - start }
      });
    } catch (error) {
      if (!isDatabaseUnavailable(error)) {
        console.error("Failed to store audit log", error);
      }
    }
  });

  next();
}
