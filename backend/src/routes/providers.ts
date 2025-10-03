import { Router, type Request, type Response, type NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { requireRole } from "../middleware/auth.js";
import { isPrismaUnavailable } from "../utils/prisma.js";
import { createDemoProvider, listDemoProviders } from "../services/demo-data.js";

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

router.post(
  "/",
  requireRole("ADMIN"),
  async (
    req: Request<unknown, unknown, { name?: string }>,
    res: Response,
    next: NextFunction
  ) => {
    const name = (req.body?.name ?? "").trim();

    if (!name) {
      return res
        .status(400)
        .json({ error: "El nombre del proveedor es obligatorio." });
    }

    try {
      const provider = await prisma.provider.create({
        data: { name }
      });
      return res.status(201).json(provider);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return res
            .status(400)
            .json({ error: "Ya existe un proveedor con ese nombre." });
        }
      }

      if (!isPrismaUnavailable(error)) return next(error);

      try {
        const provider = createDemoProvider({ name });
        return res.status(201).json(provider);
      } catch (creationError) {
        if (creationError instanceof Error) {
          return res.status(400).json({ error: creationError.message });
        }
        return next(creationError);
      }
    }
  }
);

export default router;
