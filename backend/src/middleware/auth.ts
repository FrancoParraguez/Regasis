import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../types/roles.js";
import type { AuthenticatedUser } from "../types/auth.js";

interface TokenPayload extends JwtPayload {
  sub?: string;
  role?: Role;
  providerId?: string | null;
}

function attachUser(req: Request, user: AuthenticatedUser) {
  (req as Request & { user: AuthenticatedUser }).user = user;
}

export function auth(required = true) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) {
      if (!required) return next();
      return res.status(401).json({ error: "No token" });
    }

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload | string;
      if (typeof payload === "string") {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { sub, role, providerId = null } = payload;
      if (!sub || !role) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const user: AuthenticatedUser = { id: sub, role, providerId };
      attachUser(req, user);
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
