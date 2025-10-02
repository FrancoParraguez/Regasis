import { Router, type Request, type Response, type NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
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

interface LoginBody {
  email: string;
  password: string;
}

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
  async (req: Request<unknown, unknown, LoginBody>, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
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

interface RefreshBody {
  refreshToken: string;
}

router.post(
  "/refresh",
  async (req: Request<unknown, unknown, RefreshBody>, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "refreshToken requerido" });
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
  async (req: Request<unknown, unknown, Partial<RefreshBody>>, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;
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
