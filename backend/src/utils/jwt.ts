import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

export function signAccessToken(payload: object, subject: string){
  const options: SignOptions = { subject };
  options.expiresIn = env.JWT_EXPIRES as SignOptions["expiresIn"];
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function newJti(){ return crypto.randomUUID(); }
