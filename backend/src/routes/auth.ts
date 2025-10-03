import { Router, type Request, type Response, type NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { comparePassword } from "../utils/crypto.js";
import { env } from "../config/env.js";
import { signAccessToken, newJti } from "../utils/jwt.js";
import { addDuration } from "../utils/duration.js";
import {
  findDemoUserByEmail,
  createDemoRefreshToken,
  findDemoRefreshToken,
  replaceDemoRefreshToken,
  revokeDemoRefreshToken,
  findDemoUserById
} from "../services/demo-data.js";
import { isPrismaUnavailable } from "../utils/prisma.js";
import type { AuthenticatedUser } from "../types/auth.js";
import type { Role } from "../types/roles.js";

const prisma = new PrismaClient();
const router = Router();

const emailSchema = z
  .string({ required_error: "El correo es obligatorio" })
  .trim()
  .min(1, "El correo es obligatorio")
  .refine((value) => /^[^@\s]+@[^@\s]+$/.test(value), {
    message: "El correo no es válido"
  });

const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: "La contraseña es obligatoria" })
    .min(1, "La contraseña es obligatoria")
});

type AuthResponseUser = AuthenticatedUser & { email: string; name: string };

function toResponseUser(user: {
  id: string;
  name: string;
  email: string;
  role: Role;
  providerId: string | null;
}): AuthResponseUser {
  return {
    id: user.id,
    role: user.role,
    providerId: user.providerId,
    email: user.email,
    name: user.name
  };
}

router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }

    const { email, password } = parsed.data;
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

      const ok = await comparePassword(password, user.password);
      if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

      const accessToken = signAccessToken(
        { role: user.role, providerId: user.providerId },
        user.id
      );
      const jti = newJti();
      const expiresAt = addDuration(new Date(), env.REFRESH_EXPIRES);
      await prisma.refreshToken.create({ data: { jti, userId: user.id, expiresAt } });

      return res.json({
        token: accessToken,
        refreshToken: jti,
        user: toResponseUser({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          providerId: user.providerId ?? null
        })
      });
    } catch (error) {
      if (!isPrismaUnavailable(error)) return next(error);

      const user = findDemoUserByEmail(email);
      if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

      const ok = await comparePassword(password, user.password);
      if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

      const accessToken = signAccessToken(
        { role: user.role, providerId: user.providerId },
        user.id
      );
      const demoRefresh = createDemoRefreshToken(user.id);

      return res.json({
        token: accessToken,
        refreshToken: demoRefresh.jti,
        user: toResponseUser({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          providerId: user.providerId
        })
      });
    }
  }
);

const refreshSchema = z.object({
  refreshToken: z
    .string({ required_error: "refreshToken requerido" })
    .trim()
    .min(1, "refreshToken requerido")
});

router.post(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "refreshToken requerido" });
    }
    const { refreshToken } = parsed.data;
    try {
      const rt = await prisma.refreshToken.findUnique({
        where: { jti: refreshToken },
        include: { user: true }
      });
      if (!rt || rt.revoked || rt.expiresAt < new Date()) {
        return res.status(401).json({ error: "refreshToken inválido" });
      }

      await prisma.refreshToken.update({
        where: { jti: refreshToken },
        data: { revoked: true }
      });

      const jti = newJti();
      const expiresAt = addDuration(new Date(), env.REFRESH_EXPIRES);
      await prisma.refreshToken.create({ data: { jti, userId: rt.userId, expiresAt } });

      const token = signAccessToken(
        { role: rt.user.role, providerId: rt.user.providerId },
        rt.userId
      );
      return res.json({ token, refreshToken: jti });
    } catch (error) {
      if (!isPrismaUnavailable(error)) return next(error);

      const rt = findDemoRefreshToken(refreshToken);
      if (!rt || rt.revoked || rt.expiresAt < new Date()) {
        return res.status(401).json({ error: "refreshToken inválido" });
      }

      const replacement = replaceDemoRefreshToken(refreshToken);
      if (!replacement) return res.status(401).json({ error: "refreshToken inválido" });

      const user = findDemoUserById(rt.userId);
      if (!user) return res.status(401).json({ error: "refreshToken inválido" });

      const token = signAccessToken(
        { role: user.role, providerId: user.providerId },
        user.id
      );
      return res.json({ token, refreshToken: replacement.jti });
    }
  }
);

router.post(
  "/logout",
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = refreshSchema.partial().safeParse(req.body ?? {});
    const refreshToken = parsed.success ? parsed.data.refreshToken : undefined;
    if (refreshToken) {
      try {
        await prisma.refreshToken.update({
          where: { jti: refreshToken },
          data: { revoked: true }
        });
      } catch (error) {
        if (isPrismaUnavailable(error)) {
          revokeDemoRefreshToken(refreshToken);
        } else {
          return next(error);
        }
      }
    }
    res.json({ ok: true });
  }
);

export default router;
