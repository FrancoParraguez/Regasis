import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Button, Card, Input, Label, Table } from "../components/ui";
import {
  cargarNotasDesdeArchivo,
  crearNota,
  listarCantidadNotas,
  listarNotasPorCurso,
  type GradeDTO,
  type GradeImportSummary,
  type GradeType,
  type GradeCountOption
} from "../services/notas";
import { listarMisCursos } from "../services/cursos";

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
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<GradeImportSummary | null>(
    null
  );
  const [cantidadOpciones, setCantidadOpciones] = useState<GradeCountOption[]>(
    []
  );
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState<string>("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [notaForm, setNotaForm] = useState({
    enrollmentId: "",
    type: "P1" as GradeType,
    score: "6.0",
    date: ""
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cs = await listarMisCursos();
      if (cancelled) return;
      const mapped = cs.map<CursoOption>((curso) => ({
        id: curso.id,
        code: curso.code,
        name: curso.name
      }));
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

  useEffect(() => {
    setImportSummary(null);
    setArchivo(null);
  }, [cursoId]);

  useEffect(() => {
    if (!cursoId) return;
    let cancelled = false;
    (async () => {
      try {
        const opciones = await listarCantidadNotas(cursoId);
        if (cancelled) return;
        setCantidadOpciones(opciones);
        const predeterminada =
          opciones.find((opcion) => opcion.default) ?? opciones[0];
        setCantidadSeleccionada(
          predeterminada ? String(predeterminada.value) : ""
        );
      } catch (error) {
        if (!cancelled) {
          setCantidadOpciones([]);
          setCantidadSeleccionada("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cursoId]);

  function formatRows(data: GradeDTO[]): NotaRow[] {
    return data.map((nota) => {
      const participantName =
        nota.enrollment?.participant?.name?.trim() ||
        nota.enrollment?.participant?.email?.trim() ||
        nota.enrollmentId;

      const scoreValue =
        typeof nota.score === "number" ? nota.score : Number(nota.score);
      const formattedScore = Number.isFinite(scoreValue)
        ? scoreValue.toFixed(1)
        : "";

      const dateValue =
        typeof nota.date === "string" && nota.date.length > 0
          ? nota.date.slice(0, 10)
          : "";

      const gradeType = (nota.type ?? "OTRO") as GradeType;

      return {
        id: nota.id,
        participante: participantName,
        tipo: gradeType,
        nota: formattedScore,
        fecha: dateValue
      };
    });
  }

  async function agregarNota(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cursoId) return;
    setImportSummary(null);
    const enrollmentId = notaForm.enrollmentId.trim();
    const score = Number(notaForm.score);
    if (!enrollmentId || Number.isNaN(score)) return;
    setCreating(true);
    try {
      await crearNota({
        enrollmentId,
        type: notaForm.type,
        score,
        date: notaForm.date.trim() || undefined
      });
      const data = await listarNotasPorCurso(cursoId);
      setRows(formatRows(data));
      setNotaForm((prev) => ({ ...prev, enrollmentId: "", score: "6.0", date: "" }));
    } finally {
      setCreating(false);
    }
  }

  async function importarNotas(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const cantidadSeleccionadaNumero = Number(cantidadSeleccionada);
    if (!cursoId || !archivo || !cantidadSeleccionadaNumero) return;
    setImporting(true);
    setImportSummary(null);
    setImportProgress(0);
    try {
      const summary = await cargarNotasDesdeArchivo(
        cursoId,
        archivo,
        {
          cantidad: cantidadSeleccionadaNumero,
          onProgress: setImportProgress
        }
      );
      setImportSummary(summary);
      const data = await listarNotasPorCurso(cursoId);
      setRows(formatRows(data));
      formElement.reset();
      setArchivo(null);
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  }

  const cantidadNumero = Number(cantidadSeleccionada);
  const puedeImportar = Boolean(
    cursoId && archivo && cantidadNumero > 0 && !importing
  );

  const columns = ["Participante", "Tipo", "Nota", "Fecha"];
  const tableRows = rows.map((row) => [
    row.participante,
    row.tipo,
    row.nota,
    row.fecha
  ]);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Notas</h1>
        <div className="flex items-center gap-2">
          <select
            className="input"
            value={cursoId}
            onChange={(event) => setCursoId(event.target.value)}
          >
            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.code} • {curso.name}
              </option>
            ))}
          </select>
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4 p-4">
          <h2 className="text-base font-semibold text-gray-700">
            Agregar nota manualmente
          </h2>
          <form className="space-y-3" onSubmit={agregarNota}>
            <div className="space-y-1">
              <Label htmlFor="enrollmentId">ID de inscripción</Label>
              <Input
                id="enrollmentId"
                placeholder="Ej: enr_123"
                value={notaForm.enrollmentId}
                onChange={(event) =>
                  setNotaForm((prev) => ({
                    ...prev,
                    enrollmentId: event.target.value
                  }))
                }
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="tipoNota">Tipo</Label>
                <select
                  id="tipoNota"
                  className="input"
                  value={notaForm.type}
                  onChange={(event) =>
                    setNotaForm((prev) => ({
                      ...prev,
                      type: event.target.value as GradeType
                    }))
                  }
                >
                  {(["P1", "P2", "EXAMEN", "PRACTICA", "OTRO"] as GradeType[]).map(
                    (option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="nota">Nota</Label>
                <Input
                  id="nota"
                  type="number"
                  min="1"
                  max="7"
                  step="0.1"
                  value={notaForm.score}
                  onChange={(event) =>
                    setNotaForm((prev) => ({
                      ...prev,
                      score: event.target.value
                    }))
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="fecha">Fecha (opcional)</Label>
              <Input
                id="fecha"
                type="date"
                value={notaForm.date}
                onChange={(event) =>
                  setNotaForm((prev) => ({
                    ...prev,
                    date: event.target.value
                  }))
                }
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={creating || loading}>
                {creating ? "Guardando…" : "Guardar nota"}
              </Button>
            </div>
          </form>
        </Card>
        <Card className="space-y-4 p-4">
          <h2 className="text-base font-semibold text-gray-700">Importar desde Excel</h2>
          <form className="space-y-3" onSubmit={importarNotas}>
            <div className="space-y-1">
              <Label htmlFor="archivoExcel">Archivo Excel (.xlsx)</Label>
              <Input
                id="archivoExcel"
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) =>
                  setArchivo(event.target.files ? event.target.files[0] ?? null : null)
                }
              />
              {archivo && (
                <p className="text-xs text-gray-500">{archivo.name}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cantidadNotas">Cantidad de notas a cargar</Label>
              <select
                id="cantidadNotas"
                className="input"
                value={cantidadSeleccionada}
                onChange={(event) => setCantidadSeleccionada(event.target.value)}
              >
                <option value="" disabled>
                  Selecciona una opción
                </option>
                {cantidadOpciones.map((opcion) => (
                  <option key={opcion.value} value={opcion.value}>
                    {opcion.label}
                  </option>
                ))}
              </select>
            </div>
            {importing && (
              <div className="text-xs text-gray-500">
                Subiendo archivo… {importProgress}%
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={!puedeImportar}>
                {importing ? "Importando…" : "Importar notas"}
              </Button>
            </div>
          </form>
          {importSummary && (
            <div className="space-y-1 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              <div>
                <strong>Resultados:</strong> {importSummary.total} procesados • {" "}
                {importSummary.created} creados • {importSummary.updated} actualizados • {" "}
                {importSummary.skipped} omitidos
              </div>
              {importSummary.errors.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-xs text-red-600">
                  {importSummary.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      </div>
      <Table columns={columns} rows={tableRows} />
      <div className="text-xs text-gray-500">
        Rango permitido en backend: 1.0 a 7.0 • Tipos válidos: P1, P2, EXAMEN,
        PRACTICA, OTRO.
      </div>
    </section>
  );
}
