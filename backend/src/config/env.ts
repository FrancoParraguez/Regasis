import * as dotenv from "dotenv";

dotenv.config();

export type DurationValue = string | number;

interface Env {
  PORT: number;
  NODE_ENV: string;
  JWT_SECRET: string;
  JWT_EXPIRES: DurationValue;
  REFRESH_EXPIRES: DurationValue;
  CORS_ORIGIN: string;
  DATABASE_URL: string | null;
}

const defaultJwtExpires: DurationValue = "8h";
const defaultRefreshExpires: DurationValue = "7d";

function resolveDuration(value: string | undefined, fallback: DurationValue): DurationValue {
  if(value === undefined || value.trim() === ""){
    return fallback;
  }

  const numeric = Number(value);
  if(Number.isFinite(numeric)){
    return numeric;
  }

  return value;
}

export const env: Env = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "changeme",
  JWT_EXPIRES: resolveDuration(process.env.JWT_EXPIRES, defaultJwtExpires),
  REFRESH_EXPIRES: resolveDuration(process.env.REFRESH_EXPIRES, defaultRefreshExpires),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  DATABASE_URL: process.env.DATABASE_URL?.trim() || null
};
