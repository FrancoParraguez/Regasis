import { Prisma } from "@prisma/client";

const RECOVERABLE_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2021",
  "P2022",
  "P2023",
  "P2024"
]);

export function isPrismaUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return RECOVERABLE_CODES.has(error.code);
  }

  const { code } = error as { code?: unknown };
  return typeof code === "string" && RECOVERABLE_CODES.has(code);
}
