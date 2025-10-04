import type { ImportStatus } from "../types/imports.js";
import { query, queryOne } from "./pool.js";

export interface DbImportJob {
  id: string;
  status: ImportStatus;
  kind: string;
  providerId: string | null;
  courseId: string | null;
  documentId: string | null;
  createdById: string;
  totalRows: number;
  processedRows: number;
  successCount: number;
  failureCount: number;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function createImportJob(data: {
  kind: string;
  status: ImportStatus;
  documentId?: string | null;
  createdById: string;
  totalRows?: number;
  startedAt?: Date | null;
}): Promise<DbImportJob> {
  const row = await queryOne<DbImportJob>(
    'INSERT INTO "ImportJob" ("kind", "status", "documentId", "createdById", "totalRows", "startedAt") VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [
      data.kind,
      data.status,
      data.documentId ?? null,
      data.createdById,
      data.totalRows ?? 0,
      data.startedAt ?? null
    ]
  );

  if (!row) throw new Error("Failed to create import job");
  return row;
}

export async function updateImportJob(id: string, data: Partial<{
  status: ImportStatus;
  providerId: string | null;
  courseId: string | null;
  processedRows: number;
  successCount: number;
  failureCount: number;
  errorMessage: string | null;
  completedAt: Date | null;
}>): Promise<void> {
  const setStatements: string[] = ['"updatedAt" = CURRENT_TIMESTAMP'];
  const values: unknown[] = [id];

  if (data.status !== undefined) {
    setStatements.push(`"status" = $${values.length + 1}`);
    values.push(data.status);
  }
  if (data.providerId !== undefined) {
    setStatements.push(`"providerId" = $${values.length + 1}`);
    values.push(data.providerId);
  }
  if (data.courseId !== undefined) {
    setStatements.push(`"courseId" = $${values.length + 1}`);
    values.push(data.courseId);
  }
  if (data.processedRows !== undefined) {
    setStatements.push(`"processedRows" = $${values.length + 1}`);
    values.push(data.processedRows);
  }
  if (data.successCount !== undefined) {
    setStatements.push(`"successCount" = $${values.length + 1}`);
    values.push(data.successCount);
  }
  if (data.failureCount !== undefined) {
    setStatements.push(`"failureCount" = $${values.length + 1}`);
    values.push(data.failureCount);
  }
  if (data.errorMessage !== undefined) {
    setStatements.push(`"errorMessage" = $${values.length + 1}`);
    values.push(data.errorMessage);
  }
  if (data.completedAt !== undefined) {
    setStatements.push(`"completedAt" = $${values.length + 1}`);
    values.push(data.completedAt);
  }

  if (setStatements.length === 1) return;

  const sql = `UPDATE "ImportJob" SET ${setStatements.join(", ")} WHERE "id" = $1`;
  await query(sql, values);
}
