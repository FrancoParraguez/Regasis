export function isPrismaUnavailable(error: unknown): boolean {
  if(!error || typeof error !== "object"){
    return false;
  }

  const { constructor, code } = error as { constructor?: { name?: string }; code?: string };
  const name = constructor?.name;
  return name === "PrismaClientInitializationError" || code === "P1001" || code === "P1002";
}
