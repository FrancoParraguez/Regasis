import api from "./http";

export type AuditLogDTO = {
  id: string;
  userId: string | null;
  action: string;
  method: string;
  path: string;
  status: number;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: {
    id: string;
    email: string | null;
    name: string | null;
    role: string | null;
  } | null;
};

export async function listarAuditoria() {
  const { data } = await api.get<AuditLogDTO[]>("/auditoria");
  return data;
}
