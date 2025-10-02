import { Button, Table } from "../components/ui";

export default function AdminAuditoria() {
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Auditoría</h1>
        <Button variant="ghost">Exportar CSV</Button>
      </header>
      <Table
        columns={["Fecha", "Usuario", "Acción", "Entidad", "Resultado", "IP"]}
        rows={[
          ["2025-09-30 10:10", "admin@org", "POST", "/cursos", "201", "190.54.12.10"],
          ["2025-09-30 10:12", "instructor@org", "PATCH", "/asistencias/123", "200", "190.54.12.10"],
        ]}
      />
      <div className="card flex items-center gap-3 p-4 text-sm text-gray-600">
        Auditoría inmutable. Acceso solo para Administradores.
      </div>
    </section>
  );
}
