import { Router, type Request, type Response, type NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

import { requireRole } from "../middleware/auth.js";
import { isPrismaUnavailable } from "../utils/prisma.js";
import { listDemoProviders } from "../services/demo-data.js";

const prisma = new PrismaClient();
const router = Router();

router.get(
  "/",
  requireRole("ADMIN"),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const providers = await prisma.provider.findMany({
        orderBy: { name: "asc" }
      });
      return res.json(providers);
    } catch (error) {
      if (!isPrismaUnavailable(error)) return next(error);
      return res.json(listDemoProviders());
    }
  }
);

export default router;
