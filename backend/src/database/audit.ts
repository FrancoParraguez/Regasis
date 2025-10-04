import { query } from "./pool.js";

export interface AuditLogRow {
  id: string;
  userId: string | null;
  action: string;
  method: string;
  path: string;
  status: number;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  } | null;
}

export async function insertAuditLog(data: {
  userId?: string | null;
  action: string;
  method: string;
  path: string;
  status: number;
  ip?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await query(
    'INSERT INTO audit_log (user_id, action, method, path, status, ip, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [
      data.userId ?? null,
      data.action,
      data.method,
      data.path,
      data.status,
      data.ip ?? null,
      data.metadata ?? null
    ]
  );
}

export async function listAuditLogs(limit = 200): Promise<AuditLogRow[]> {
  const rows = await query<{
    id: string;
    userId: string | null;
    action: string;
    method: string;
    path: string;
    status: number;
    ip: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    user_id: string | null;
    user_email: string | null;
    user_name: string | null;
    user_role: string | null;
  }>(
    'SELECT a.id, a.user_id AS "userId", a.action, a.method, a.path, a.status, a.ip, a.metadata, a.created_at AS "createdAt", u.id AS user_id, u.email AS user_email, u.name AS user_name, u.role AS user_role ' +
      'FROM audit_log a LEFT JOIN app_user u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT $1',
    [limit]
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    action: row.action,
    method: row.method,
    path: row.path,
    status: row.status,
    ip: row.ip,
    metadata: row.metadata,
    createdAt: row.createdAt,
    user:
      row.user_id && row.user_email && row.user_name && row.user_role
        ? {
            id: row.user_id,
            email: row.user_email,
            name: row.user_name,
            role: row.user_role
          }
        : null
  }));
}
