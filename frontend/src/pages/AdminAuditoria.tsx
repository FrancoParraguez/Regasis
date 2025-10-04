import { useEffect, useMemo, useState } from "react";

import { Button, Card, Table } from "../components/ui";
import { listarAuditoria, type AuditLogDTO } from "../services/auditoria";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AdminAuditoria() {
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await listarAuditoria();
        if (!cancelled) {
          setLogs(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLogs([]);
          setError("No se pudo cargar el registro de auditoría.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(
    () =>
      logs.map((log) => [
        formatDate(log.createdAt),
        log.user?.email ?? "—",
        log.action || log.method,
        log.path,
        String(log.status),
        log.ip ?? "—"
      ]),
    [logs]
  );

  const isEmpty = !loading && rows.length === 0;

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Auditoría</h1>
        <Button variant="ghost" disabled={rows.length === 0}>
          Exportar CSV
        </Button>
      </header>
      {loading ? (
        <Card className="p-4 text-sm text-gray-600">Cargando registros…</Card>
      ) : error ? (
        <Card className="p-4 text-sm text-red-600">{error}</Card>
      ) : rows.length > 0 ? (
        <Table
          columns={["Fecha", "Usuario", "Acción", "Entidad", "Resultado", "IP"]}
          rows={rows}
        />
      ) : null}
      {isEmpty ? (
        <Card className="p-4 text-sm text-gray-600">No hay registros de auditoría.</Card>
      ) : null}
      <div className="card flex items-center gap-3 p-4 text-sm text-gray-600">
        Auditoría inmutable. Acceso solo para Administradores.
      </div>
    </section>
  );
}
