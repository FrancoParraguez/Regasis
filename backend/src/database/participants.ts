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
    'INSERT INTO "Participant" ("email", "name", "providerId") VALUES ($1,$2,$3) ' +
      'ON CONFLICT ("email") DO UPDATE SET "name" = EXCLUDED."name", "providerId" = EXCLUDED."providerId", "updatedAt" = CURRENT_TIMESTAMP RETURNING *',
    [data.email, data.name, data.providerId ?? null]
  );

  if (!row) throw new Error("Failed to upsert participant");
  return row;
}
