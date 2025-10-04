import { query, queryOne } from "./pool.js";

export interface DbDocument {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
  createdById: string;
  providerId: string | null;
  courseId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function createDocument(data: {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum?: string | null;
  metadata?: Record<string, unknown> | null;
  createdById: string;
}): Promise<DbDocument> {
  const row = await queryOne<DbDocument>(
    'INSERT INTO document (filename, original_name, mime_type, size, checksum, metadata, created_by_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, filename, original_name AS "originalName", mime_type AS "mimeType", size, checksum, url, metadata, created_by_id AS "createdById", provider_id AS "providerId", course_id AS "courseId", created_at AS "createdAt", updated_at AS "updatedAt"',
    [
      data.filename,
      data.originalName,
      data.mimeType,
      data.size,
      data.checksum ?? null,
      data.metadata ?? null,
      data.createdById
    ]
  );

  if (!row) throw new Error("Failed to create document");
  return row;
}

export async function updateDocument(id: string, data: { providerId?: string | null; courseId?: string | null }): Promise<void> {
  const setStatements: string[] = [];
  const values: unknown[] = [id];

  if (Object.prototype.hasOwnProperty.call(data, "providerId")) {
    setStatements.push(`provider_id = $${values.length + 1}`);
    values.push(data.providerId ?? null);
  }

  if (Object.prototype.hasOwnProperty.call(data, "courseId")) {
    setStatements.push(`course_id = $${values.length + 1}`);
    values.push(data.courseId ?? null);
  }

  if (setStatements.length === 0) return;

  setStatements.push(`updated_at = CURRENT_TIMESTAMP`);
  const sql = `UPDATE document SET ${setStatements.join(", ")} WHERE id = $1`;
  await query(sql, values);
}
