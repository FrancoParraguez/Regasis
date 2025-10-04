import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { comparePassword } from "../utils/crypto.js";
import { env } from "../config/env.js";
import { signAccessToken, newJti } from "../utils/jwt.js";
import { addDuration } from "../utils/duration.js";
import { isDatabaseUnavailable } from "../utils/database.js";
import {
  findUserByEmail,
  createRefreshToken,
  findRefreshTokenWithUser,
  revokeRefreshToken
} from "../database/auth.js";
import type { AuthenticatedUser } from "../types/auth.js";
import type { Role } from "../types/roles.js";

const router = Router();

const loginSchema = z.object({
  email: z
    .string({ required_error: "El correo es obligatorio" })
    .trim()
    .min(1, "El correo es obligatorio")
    .email("El correo no es válido"),
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
      const user = await findUserByEmail(email);
      if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

      const ok = await comparePassword(password, user.password);
      if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

      const accessToken = signAccessToken(
        { role: user.role, providerId: user.providerId },
        user.id
      );
      const jti = newJti();
      const expiresAt = addDuration(new Date(), env.REFRESH_EXPIRES);
      await createRefreshToken({ jti, userId: user.id, expiresAt });

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
      if (isDatabaseUnavailable(error)) {
        return res
          .status(503)
          .json({ error: "El servicio de autenticación no está disponible. Intenta nuevamente más tarde." });
      }

      return next(error);
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
      const rt = await findRefreshTokenWithUser(refreshToken);
      if (!rt || rt.revoked || rt.expiresAt < new Date()) {
        return res.status(401).json({ error: "refreshToken inválido" });
      }

      await revokeRefreshToken(refreshToken);

      const jti = newJti();
      const expiresAt = addDuration(new Date(), env.REFRESH_EXPIRES);
      await createRefreshToken({ jti, userId: rt.userId, expiresAt });

      const token = signAccessToken(
        { role: rt.user.role, providerId: rt.user.providerId },
        rt.userId
      );
      return res.json({ token, refreshToken: jti });
    } catch (error) {
      if (isDatabaseUnavailable(error)) {
        return res
          .status(503)
          .json({ error: "El servicio de autenticación no está disponible. Intenta nuevamente más tarde." });
      }

      return next(error);
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
        await revokeRefreshToken(refreshToken);
      } catch (error) {
        if (isDatabaseUnavailable(error)) {
          return res
            .status(503)
            .json({ error: "El servicio de autenticación no está disponible. Intenta nuevamente más tarde." });
        }
        return next(error);
      }
    }
    return res.json({ ok: true });
  }
);

export default router;
