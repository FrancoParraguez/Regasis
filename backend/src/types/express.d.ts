import "express";
declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; role: "ADMIN"|"INSTRUCTOR"|"REPORTER"; providerId?: string|null };
  }
}
export {};
