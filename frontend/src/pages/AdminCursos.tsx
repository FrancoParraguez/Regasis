import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Table } from "../components/ui";
import { Settings } from "lucide-react";
import { listarCursos } from "../services/cursos";

type CursoItem = {
  id: string;
  codigo: string;
  nombre: string;
  proveedor: string;
  fechas: string;
  instructores: string[];
};

export default function AdminCursos() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<CursoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const apiCursos = await listarCursos();
        const mapped = apiCursos.map<CursoItem>((c) => ({
          id: c.id,
          codigo: c.code,
          nombre: c.name,
          proveedor: "—",
          fechas: `${new Date(c.startDate).toLocaleDateString()} – ${new Date(c.endDate).toLocaleDateString()}`,
          instructores: [],
        }));
        setItems(mapped);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cursos = useMemo(
    () => items.filter((c) => (c.codigo + c.nombre + c.proveedor).toLowerCase().includes(q.toLowerCase())),
    [q, items]
  );

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Cursos</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Buscar cursos…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button>Nuevo curso</Button>
          <Button variant="ghost">
            <Settings size={16} /> Configuración
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 space-y-4 md:col-span-8 lg:col-span-9">
          {loading && <Card className="p-4 text-sm text-gray-600">Cargando…</Card>}
          <Table
            columns={["Código", "Nombre", "Proveedor", "Fechas", "Instructores", "Acciones"]}
            rows={cursos.map((c) => [
              <span className="font-medium" key={c.id}>
                {c.codigo}
              </span>,
              c.nombre,
              c.proveedor,
              c.fechas,
              <span key={`${c.id}-i`} className="text-gray-600">
                {c.instructores.join(", ")}
              </span>,
              <div key={`${c.id}-a`} className="flex gap-2">
                <Button variant="ghost">Editar</Button>
                <Button variant="ghost" className="text-red-600">
                  Eliminar
                </Button>
              </div>,
            ])}
          />
        </div>
        <div className="col-span-12 space-y-4 md:col-span-4 lg:col-span-3">
          <Card className="p-4">
            <div className="text-sm text-gray-500">Cursos activos</div>
            <div className="mt-1 text-2xl font-bold">{items.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Instructores</div>
            <div className="mt-1 text-2xl font-bold">3</div>
            <div className="mt-2 text-xs text-gray-500">Promedio 1.5 por curso</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-semibold">Validaciones clave</div>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>
                <span className="dot" /> Código de curso único
              </li>
              <li>
                <span className="dot" /> Soft delete recomendado
              </li>
              <li>
                <span className="dot" /> Confirmar si tiene clases
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
}
