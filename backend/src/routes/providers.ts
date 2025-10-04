import { Router, type Request, type Response, type NextFunction } from "express";
import { requireRole } from "../middleware/auth.js";
import { isDatabaseUnavailable } from "../utils/database.js";
import { listProviders, createProvider } from "../database/providers.js";
const router = Router();

router.get(
  "/",
  requireRole("ADMIN"),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const providers = await listProviders();
      return res.json(providers);
    } catch (error) {
      if (isDatabaseUnavailable(error)) {
        return res
          .status(503)
          .json({ error: "La base de datos no está disponible. Intenta nuevamente más tarde." });
      }
      return next(error);
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
      const provider = await createProvider({ name });
      return res.status(201).json(provider);
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        return res
          .status(400)
          .json({ error: "Ya existe un proveedor con ese nombre." });
      }

      if (isDatabaseUnavailable(error)) {
        return res
          .status(503)
          .json({ error: "La base de datos no está disponible. Intenta nuevamente más tarde." });
      }

      return next(error);
    }
  }
);

export default router;
