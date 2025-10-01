import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function auth(required = true){
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : undefined;
    if(!token){
      if(!required) return next();
      return res.status(401).json({ error: "No token" });
    }
    try{
      const payload = jwt.verify(token, env.JWT_SECRET) as any;
      (req as any).user = { id: payload.sub, role: payload.role, providerId: payload.providerId };
      next();
    }catch{
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}
export function requireRole(...roles: ("ADMIN"|"INSTRUCTOR"|"REPORTER")[]){
  return (req: any, res: any, next: NextFunction) => {
    if(!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
