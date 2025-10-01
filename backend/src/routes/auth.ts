import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { comparePassword } from "../utils/crypto.js";
import { env, type DurationValue } from "../config/env.js";
import { signAccessToken, newJti } from "../utils/jwt.js";

const prisma = new PrismaClient();
const router = Router();

type DurationUnit = "ms" | "s" | "m" | "h" | "d" | "w" | "y";

const durationMultipliers: Record<DurationUnit, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  y: 31_557_600_000
};

function durationToMs(duration: DurationValue): number {
  if (typeof duration === "number") {
    if (!Number.isFinite(duration)) {
      throw new Error(`Duración inválida: ${duration}`);
    }
    return duration;
  }

  const trimmed = duration.trim();
  if (trimmed === "") {
    throw new Error("Duración inválida: cadena vacía");
  }

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && /^[-+]?\d+(?:\.\d+)?$/.test(trimmed)) {
    return numeric;
  }

  const match = trimmed.match(/^([-+]?\d+(?:\.\d+)?)(ms|s|m|h|d|w|y)$/i);
  if (!match) {
    throw new Error(`Duración inválida: ${duration}`);
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase() as DurationUnit;
  const multiplier = durationMultipliers[unit];
  return value * multiplier;
}

function addDuration(base: Date, duration: DurationValue) {
  const baseDate = new Date(base);
  const durationMs = durationToMs(duration);
  if (durationMs < 0) {
    throw new Error(`Duración inválida: ${duration}`);
  }
  baseDate.setTime(baseDate.getTime() + durationMs);
  return baseDate;
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Credenciales inválidas" });
  const ok = await comparePassword(password, user.password);
  if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

  const accessToken = signAccessToken({ role: user.role, providerId: user.providerId }, user.id);
  const jti = newJti();
  const expiresAt = addDuration(new Date(), env.REFRESH_EXPIRES);
  await prisma.refreshToken.create({ data: { jti, userId: user.id, expiresAt } });

  res.json({
    token: accessToken,
    refreshToken: jti,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, providerId: user.providerId }
  });
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken: string };
  if (!refreshToken) return res.status(400).json({ error: "refreshToken requerido" });
  const rt = await prisma.refreshToken.findUnique({ where: { jti: refreshToken }, include: { user: true } });
  if (!rt || rt.revoked || rt.expiresAt < new Date()) return res.status(401).json({ error: "refreshToken inválido" });

  await prisma.refreshToken.update({ where: { jti: refreshToken }, data: { revoked: true } });
  const jti = newJti();
  const expiresAt = addDuration(new Date(), env.REFRESH_EXPIRES);
  await prisma.refreshToken.create({ data: { jti, userId: rt.userId, expiresAt } });

  const token = signAccessToken({ role: rt.user.role, providerId: rt.user.providerId }, rt.userId);
  res.json({ token, refreshToken: jti });
});

router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken: string };
  if (refreshToken) {
    try {
      await prisma.refreshToken.update({ where: { jti: refreshToken }, data: { revoked: true } });
    } catch {}
  }
  res.json({ ok: true });
});

export default router;
