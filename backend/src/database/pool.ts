import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { env } from "../config/env.js";

export const pool = new Pool({ connectionString: env.DATABASE_URL });

export type DatabaseClient = PoolClient;

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: DatabaseClient
): Promise<T[]> {
  if (client) {
    const result: QueryResult<T> = await client.query<T>(text, params);
    return result.rows;
  }

  const connection = await pool.connect();
  try {
    const result: QueryResult<T> = await connection.query<T>(text, params);
    return result.rows;
  } finally {
    connection.release();
  }
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: DatabaseClient
): Promise<T | null> {
  const rows = await query<T>(text, params, client);
  return rows[0] ?? null;
}

export async function withTransaction<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
