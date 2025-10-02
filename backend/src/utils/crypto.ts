const SALT_ROUNDS = 10;

type BcryptImplementation = {
  hash(data: string, saltOrRounds: string | number): Promise<string>;
  compare(data: string, encrypted: string): Promise<boolean>;
};

let bcryptModulePromise: Promise<BcryptImplementation> | undefined;

function extractBcryptImplementation(module: unknown): BcryptImplementation {
  const resolved = (module as { default?: unknown })?.default ?? module;

  if (
    !resolved ||
    typeof (resolved as { hash?: unknown }).hash !== "function" ||
    typeof (resolved as { compare?: unknown }).compare !== "function"
  ) {
    throw new Error("Resolved bcrypt implementation does not expose hash and compare functions.");
  }

  return resolved as BcryptImplementation;
}

function isModuleNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const { code } = error as { code?: unknown };
  return code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND";
}

async function loadBcryptImplementation(): Promise<BcryptImplementation> {
  if (!bcryptModulePromise) {
    bcryptModulePromise = import("bcryptjs")
      .then(extractBcryptImplementation)
      .catch(async (error) => {
        if (isModuleNotFoundError(error)) {
          const fallback = await import("bcrypt");
          return extractBcryptImplementation(fallback);
        }

        throw error;
      });
  }

  return bcryptModulePromise;
}

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await loadBcryptImplementation();
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await loadBcryptImplementation();
  return bcrypt.compare(password, hash);
}
