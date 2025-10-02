import { useEffect, useMemo, useState } from "react";
import { Settings } from "lucide-react";

import { Button, Card, Input, Table } from "../components/ui";
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
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CursoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const apiCursos = await listarCursos();
        if (cancelled) return;
        const mapped = apiCursos.map<CursoItem>((curso) => ({
          id: curso.id,
          codigo: curso.code,
          nombre: curso.name,
          proveedor: "—",
          fechas: `${new Date(curso.startDate).toLocaleDateString()} – ${new Date(curso.endDate).toLocaleDateString()}`,
          instructores: [],
        }));
        setItems(mapped);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cursos = useMemo(
    () => items.filter((curso) => (curso.codigo + curso.nombre + curso.proveedor).toLowerCase().includes(query.toLowerCase())),
    [query, items],
  );

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Cursos</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Buscar cursos…" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Button>Nuevo curso</Button>
          <Button variant="ghost">
            <Settings size={16} /> Configuración
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 space-y-4 md:col-span-8 lg:col-span-9">
          {loading ? <Card className="p-4 text-sm text-gray-600">Cargando…</Card> : null}
          <Table
            columns={["Código", "Nombre", "Proveedor", "Fechas", "Instructores", "Acciones"]}
            rows={cursos.map((curso) => [
              <span className="font-medium" key={curso.id}>
                {curso.codigo}
              </span>,
              curso.nombre,
              curso.proveedor,
              curso.fechas,
              <span key={`${curso.id}-i`} className="text-gray-600">
                {curso.instructores.join(", ")}
              </span>,
              <div key={`${curso.id}-a`} className="flex gap-2">
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
