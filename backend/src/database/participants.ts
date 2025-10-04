import { queryOne } from "./pool.js";

export interface DbParticipant {
  id: string;
  email: string;
  name: string;
  providerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function upsertParticipantByEmail(data: {
  email: string;
  name: string;
  providerId?: string | null;
}): Promise<DbParticipant> {
  const row = await queryOne<DbParticipant>(
    'INSERT INTO participant (email, name, provider_id) VALUES ($1,$2,$3) ' +
      'ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, provider_id = EXCLUDED.provider_id, updated_at = CURRENT_TIMESTAMP RETURNING id, email, name, provider_id AS "providerId", created_at AS "createdAt", updated_at AS "updatedAt"',
    [data.email, data.name, data.providerId ?? null]
  );

  if (!row) throw new Error("Failed to upsert participant");
  return row;
}
