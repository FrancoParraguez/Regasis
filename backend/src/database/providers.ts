import { query, queryOne } from "./pool.js";

export interface DbProvider {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function listProviders(): Promise<DbProvider[]> {
  return query<DbProvider>(
    'SELECT id, name, created_at AS "createdAt", updated_at AS "updatedAt" FROM provider ORDER BY name ASC'
  );
}

export async function createProvider(data: { name: string }): Promise<DbProvider> {
  const row = await queryOne<DbProvider>(
    'INSERT INTO provider (name) VALUES ($1) RETURNING id, name, created_at AS "createdAt", updated_at AS "updatedAt"',
    [data.name]
  );

  if (!row) throw new Error("Failed to create provider");
  return row;
}

export async function upsertProviderByName(name: string): Promise<DbProvider> {
  const row = await queryOne<DbProvider>(
    'INSERT INTO provider (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET updated_at = CURRENT_TIMESTAMP RETURNING id, name, created_at AS "createdAt", updated_at AS "updatedAt"',
    [name]
  );
  if (!row) throw new Error("Failed to upsert provider");
  return row;
}
