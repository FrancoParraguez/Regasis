import { useEffect, useState } from "react";

import { Button, Table } from "../components/ui";
import { listarMisCursos } from "../services/cursos";
import { crearNota, listarNotasPorCurso, type GradeDTO, type GradeType } from "../services/notas";

type NotaRow = {
  id: string;
  participante: string;
  tipo: GradeType;
  nota: string;
  fecha: string;
};

type CursoOption = { id: string; code: string; name: string };

export default function InstructorNotas() {
  const [cursoId, setCursoId] = useState<string>("");
  const [cursos, setCursos] = useState<CursoOption[]>([]);
  const [rows, setRows] = useState<NotaRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cs = await listarMisCursos();
      if (cancelled) return;
      const mapped = cs.map<CursoOption>((curso) => ({ id: curso.id, code: curso.code, name: curso.name }));
      setCursos(mapped);
      if (mapped[0]) setCursoId(mapped[0].id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cursoId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await listarNotasPorCurso(cursoId);
        if (!cancelled) setRows(formatRows(data));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cursoId]);

  function formatRows(data: GradeDTO[]): NotaRow[] {
    return data.map((nota) => ({
      id: nota.id,
      participante: nota.enrollment?.participant?.name ?? "",
      tipo: nota.type,
      nota: nota.score.toFixed(1),
      fecha: nota.date.slice(0, 10),
    }));
  }

  async function agregar() {
    const enrollmentId = window.prompt("ID de inscripción (enrollmentId):")?.trim();
    const type = (window.prompt("Tipo (P1,P2,EXAMEN,PRACTICA,OTRO):") || "P1").toUpperCase() as GradeType;
    const scoreInput = window.prompt("Nota (1.0 a 7.0):") || "6.0";
    const score = Number(scoreInput);
    if (!enrollmentId || Number.isNaN(score)) return;
    await crearNota({ enrollmentId, type, score });
    const data = await listarNotasPorCurso(cursoId);
    setRows(formatRows(data));
  }

  const columns = ["Participante", "Tipo", "Nota", "Fecha"];
  const tableRows = rows.map((row) => [row.participante, row.tipo, row.nota, row.fecha]);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Notas</h1>
        <div className="flex items-center gap-2">
          <select className="input" value={cursoId} onChange={(event) => setCursoId(event.target.value)}>
            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.code} • {curso.name}
              </option>
            ))}
          </select>
          <Button onClick={agregar} disabled={!cursoId || loading}>
            {loading ? "…" : "Agregar nota"}
          </Button>
        </div>
      </header>
      <Table columns={columns} rows={tableRows} />
      <div className="text-xs text-gray-500">
        Rango permitido en backend: 1.0 a 7.0 • Tipos válidos: P1, P2, EXAMEN, PRACTICA, OTRO.
      </div>
    </section>
  );
}
