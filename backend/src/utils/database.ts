const RECOVERABLE_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT"
]);

export function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const { code } = error as { code?: unknown };
  if (typeof code === "string" && RECOVERABLE_CODES.has(code)) {
    return true;
  }

  if (error instanceof Error) {
    if (/timeout/i.test(error.message)) return true;
    if (/connection (?:terminated|closed|refused)/i.test(error.message)) return true;
  }

  return false;
}
