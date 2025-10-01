import * as dotenv from "dotenv";
import type { StringValue } from "ms";

dotenv.config();

interface Env {
  PORT: number;
  NODE_ENV: string;
  JWT_SECRET: string;
  JWT_EXPIRES: StringValue | number;
  REFRESH_EXPIRES: StringValue | number;
  CORS_ORIGIN: string;
  DATABASE_URL: string;
}

const defaultJwtExpires: StringValue = "8h";
const defaultRefreshExpires: StringValue = "7d";

function requireEnv(key: keyof NodeJS.ProcessEnv): string {
  const value = process.env[key];
  if(!value){
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env: Env = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "changeme",
  JWT_EXPIRES: (process.env.JWT_EXPIRES as StringValue | undefined) || defaultJwtExpires,
  REFRESH_EXPIRES: (process.env.REFRESH_EXPIRES as StringValue | undefined) || defaultRefreshExpires,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  DATABASE_URL: requireEnv("DATABASE_URL")
};
