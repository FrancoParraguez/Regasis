import { PrismaClient } from "@prisma/client";
import type { Request, Response, NextFunction } from "express";
const prisma = new PrismaClient();

export async function audit(req: Request, res: Response, next: NextFunction){
  const start = Date.now();
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress || undefined;
  const userId = (req as any).user?.id as string | undefined;

  res.on("finish", async () => {
    try{
      await prisma.auditLog.create({ data: {
        userId, action: `${req.method} ${req.path}`, method: req.method, path: req.path,
        status: res.statusCode, ip, metadata: { ms: Date.now() - start }
      }});
    }catch{}
  });
  next();
}
