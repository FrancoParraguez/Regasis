import { query, queryOne } from "./pool.js";

export interface DbProvider {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function listProviders(): Promise<DbProvider[]> {
  return query<DbProvider>('SELECT "id", "name", "createdAt", "updatedAt" FROM "Provider" ORDER BY "name" ASC');
}

export async function createProvider(data: { name: string }): Promise<DbProvider> {
  const row = await queryOne<DbProvider>(
    'INSERT INTO "Provider" ("name") VALUES ($1) RETURNING "id", "name", "createdAt", "updatedAt"',
    [data.name]
  );

  if (!row) throw new Error("Failed to create provider");
  return row;
}

export async function upsertProviderByName(name: string): Promise<DbProvider> {
  const row = await queryOne<DbProvider>(
    'INSERT INTO "Provider" ("name") VALUES ($1) ON CONFLICT ("name") DO UPDATE SET "updatedAt" = CURRENT_TIMESTAMP RETURNING "id", "name", "createdAt", "updatedAt"',
    [name]
  );
  if (!row) throw new Error("Failed to upsert provider");
  return row;
}
