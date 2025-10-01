import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { comparePassword } from "../utils/crypto.js";
import { env } from "../config/env.js";
import { signAccessToken, newJti } from "../utils/jwt.js";
const prisma = new PrismaClient();
const router = Router();

function addDuration(base: Date, duration: string){
  const d = new Date(base);
  const m = duration.match(/(\d+)([smhdw])/i);
  const n = m ? parseInt(m[1],10) : 7;
  const u = m ? m[2].toLowerCase() : 'd';
  const mult: Record<string, number> = { s:1e3, m:6e4, h:36e5, d:864e5, w:6048e5 };
  d.setTime(d.getTime() + n * (mult[u] ?? 864e5));
  return d;
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await prisma.user.findUnique({ where: { email } });
  if(!user) return res.status(401).json({ error: "Credenciales invÃ¡lidas" });
  const ok = await comparePassword(password, user.password);
  if(!ok) return res.status(401).json({ error: "Credenciales invÃ¡lidas" });

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
  if(!refreshToken) return res.status(400).json({ error: "refreshToken requerido" });
  const rt = await prisma.refreshToken.findUnique({ where: { jti: refreshToken }, include: { user: true } });
  if(!rt || rt.revoked || rt.expiresAt < new Date()) return res.status(401).json({ error: "refreshToken invÃ¡lido" });

  await prisma.refreshToken.update({ where: { jti: refreshToken }, data: { revoked: true } });
  const jti = newJti();
  const expiresAt = addDuration(new Date(), env.REFRESH_EXPIRES);
  await prisma.refreshToken.create({ data: { jti, userId: rt.userId, expiresAt } });

  const token = signAccessToken({ role: rt.user.role, providerId: rt.user.providerId }, rt.userId);
  res.json({ token, refreshToken: jti });
});

router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken: string };
  if(refreshToken){
    try{ await prisma.refreshToken.update({ where: { jti: refreshToken }, data: { revoked: true } }); }catch{}
  }
  res.json({ ok: true });
});

export default router;
