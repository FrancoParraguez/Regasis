import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";
export function signAccessToken(payload: object, subject: string){
  return jwt.sign(payload, env.JWT_SECRET, { subject, expiresIn: env.JWT_EXPIRES });
}
export function newJti(){ return crypto.randomUUID(); }
