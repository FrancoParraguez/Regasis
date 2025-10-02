import { Button, Table } from "../components/ui";

export default function InstructorSesiones() {
  const rows = [
    ["2025-10-03", "CUR-001", "Seguridad en Obra", <Button key="s1" variant="ghost">Abrir</Button>],
    ["2025-10-10", "CUR-001", "Seguridad en Obra", <Button key="s2" variant="ghost">Abrir</Button>],
  ];

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sesiones</h1>
        <Button>Nueva sesión</Button>
      </header>
      <Table columns={["Fecha", "Código", "Curso", "Acciones"]} rows={rows} />
    </section>
  );
}
