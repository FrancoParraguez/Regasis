import { useEffect, useMemo, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { Button, Card, Input, Label } from "../components/ui";
import {
  cargarNotasDesdeArchivo,
  crearNota,
  listarNotasPorCurso,
  type GradeDTO,
  type GradeImportSummary,
  type GradeType,
  type GradeUpdateMode
} from "../services/notas";
import { listarCursos, listarMisCursos } from "../services/cursos";
import { useAuth } from "../hooks/AuthProvider";

type CursoOption = {
  id: string;
  code: string;
  name: string;
  senceCode?: string | null;
  startDate: string;
  endDate: string;
};

type GradeCell = {
  id?: string;
  score: string;
  date?: string;
};

type EnrollmentRow = {
  enrollmentId: string;
  participant: string;
  email?: string;
  grades: Partial<Record<GradeType, GradeCell>>;
};

const GRADE_TYPES: GradeType[] = ["P1", "P2", "EXAMEN", "PRACTICA", "OTRO"];

export default function InstructorNotas() {
  const { user } = useAuth();
  const [cursoId, setCursoId] = useState<string>("");
  const [cursos, setCursos] = useState<CursoOption[]>([]);
  const [rows, setRows] = useState<EnrollmentRow[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<GradeType[]>([]);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<GradeImportSummary | null>(
    null
  );
  const [archivo, setArchivo] = useState<File | null>(null);
  const [nuevaEvaluacion, setNuevaEvaluacion] = useState<GradeType | "">("");
  const [evaluacionSeleccionada, setEvaluacionSeleccionada] = useState<
    GradeType | ""
  >("");
  const [modoImportacion, setModoImportacion] = useState<GradeUpdateMode>(
    "missing"
  );

  const evaluacionesDisponibles = useMemo(
    () => GRADE_TYPES.filter((tipo) => !evaluaciones.includes(tipo)),
    [evaluaciones]
  );

  const evaluacionSeleccionadaTieneNotas = useMemo(() => {
    if (!evaluacionSeleccionada) return false;
    return rows.some((row) => Boolean(row.grades[evaluacionSeleccionada]?.score));
  }, [rows, evaluacionSeleccionada]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fetchCursos = user?.role === "ADMIN" ? listarCursos : listarMisCursos;
      const cs = await fetchCursos();
      if (cancelled) return;
      const mapped = cs.map<CursoOption>((curso) => ({
        id: curso.id,
        code: curso.code,
        name: curso.name,
        senceCode: curso.senceCode ?? null,
        startDate: curso.startDate ?? "",
        endDate: curso.endDate ?? ""
      }));
      setCursos(mapped);
      if (mapped[0]) {
        setCursoId((prev) =>
          prev && mapped.some((curso) => curso.id === prev) ? prev : mapped[0].id
        );
      } else {
        setCursoId("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  useEffect(() => {
    if (!cursoId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await listarNotasPorCurso(cursoId);
        if (!cancelled) aplicarNotas(data);
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
    setModoImportacion("missing");
  }, [cursoId]);

  useEffect(() => {
    setModoImportacion("missing");
  }, [evaluacionSeleccionada]);

  useEffect(() => {
    if (
      nuevaEvaluacion &&
      !evaluacionesDisponibles.includes(nuevaEvaluacion as GradeType)
    ) {
      setNuevaEvaluacion("");
    }
  }, [evaluacionesDisponibles, nuevaEvaluacion]);

  function crearClaveCelda(enrollmentId: string, evaluacion: GradeType) {
    return `${enrollmentId}::${evaluacion}`;
  }

  function construirFilas(data: GradeDTO[]) {
    const porInscripcion = new Map<string, EnrollmentRow>();
    const tiposEnDatos = new Set<GradeType>();

    data.forEach((nota) => {
      const enrollmentId = nota.enrollmentId;
      const participantName =
        nota.enrollment?.participant?.name?.trim() ||
        nota.enrollment?.participant?.email?.trim() ||
        enrollmentId;
      const participantEmail = nota.enrollment?.participant?.email ?? undefined;
      let fila = porInscripcion.get(enrollmentId);
      if (!fila) {
        fila = {
          enrollmentId,
          participant: participantName,
          email: participantEmail ?? undefined,
          grades: {}
        };
        porInscripcion.set(enrollmentId, fila);
      }

      const tipo = (nota.type ?? "OTRO") as GradeType;
      tiposEnDatos.add(tipo);

      const scoreValue =
        typeof nota.score === "number" ? nota.score : Number(nota.score);
      const formattedScore = Number.isFinite(scoreValue)
        ? scoreValue.toFixed(1)
        : "";

      const dateValue =
        typeof nota.date === "string" && nota.date.length > 0
          ? nota.date.slice(0, 10)
          : undefined;

      fila.grades[tipo] = {
        id: nota.id,
        score: formattedScore,
        date: dateValue
      };
    });

    const filasOrdenadas = Array.from(porInscripcion.values()).sort((a, b) =>
      a.participant.localeCompare(b.participant, "es", { sensitivity: "base" })
    );

    const evaluacionesDesdeDatos = GRADE_TYPES.filter((tipo) =>
      tiposEnDatos.has(tipo)
    );

    return { filasOrdenadas, evaluacionesDesdeDatos };
  }

  function construirValoresEdicion(
    filas: EnrollmentRow[],
    tipos: GradeType[]
  ) {
    const valores: Record<string, string> = {};
    filas.forEach((fila) => {
      tipos.forEach((tipo) => {
        const clave = crearClaveCelda(fila.enrollmentId, tipo);
        valores[clave] = fila.grades[tipo]?.score ?? "";
      });
    });
    return valores;
  }

  function aplicarNotas(data: GradeDTO[]) {
    const { filasOrdenadas, evaluacionesDesdeDatos } = construirFilas(data);

    const baseEvaluaciones =
      evaluacionesDesdeDatos.length > 0 ? evaluacionesDesdeDatos : ["P1"];

    const conjuntoFinal = new Set<GradeType>([
      ...evaluaciones,
      ...baseEvaluaciones
    ]);
    const listaFinal = GRADE_TYPES.filter((tipo) => conjuntoFinal.has(tipo));
    const evaluacionesFinales = listaFinal.length ? listaFinal : baseEvaluaciones;

    setRows(filasOrdenadas);
    setEvaluaciones(evaluacionesFinales);
    setEditingValues(construirValoresEdicion(filasOrdenadas, evaluacionesFinales));

    if (
      evaluacionSeleccionada &&
      !evaluacionesFinales.includes(evaluacionSeleccionada)
    ) {
      setEvaluacionSeleccionada("");
    }
  }

  async function recargarNotas() {
    if (!cursoId) return;
    setLoading(true);
    try {
      const data = await listarNotasPorCurso(cursoId);
      aplicarNotas(data);
    } finally {
      setLoading(false);
    }
  }

  async function importarNotas(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!cursoId || !archivo || !evaluacionSeleccionada) return;
    setImporting(true);
    setImportSummary(null);
    setImportProgress(0);
    try {
      const summary = await cargarNotasDesdeArchivo(cursoId, archivo, {
        evaluation: evaluacionSeleccionada,
        mode: modoImportacion,
        onProgress: setImportProgress
      });
      setImportSummary(summary);
      await recargarNotas();
      formElement.reset();
      setArchivo(null);
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  }

  function agregarEvaluacion() {
    if (!nuevaEvaluacion) return;
    setEvaluaciones((prev) => {
      if (prev.includes(nuevaEvaluacion)) return prev;
      const combinadas = [...prev, nuevaEvaluacion];
      const ordenadas = GRADE_TYPES.filter((tipo) => combinadas.includes(tipo));
      setEditingValues((valores) => {
        const siguientes = { ...valores };
        rows.forEach((fila) => {
          const clave = crearClaveCelda(fila.enrollmentId, nuevaEvaluacion);
          if (!(clave in siguientes)) siguientes[clave] = "";
        });
        return siguientes;
      });
      return ordenadas;
    });
    setNuevaEvaluacion("");
  }

  function eliminarEvaluacion(tipo: GradeType) {
    setEvaluaciones((prev) => {
      const filtradas = prev.filter((actual) => actual !== tipo);
      const resultado = filtradas;
      setEditingValues((valores) => {
        const siguientes = { ...valores };
        rows.forEach((fila) => {
          const clave = crearClaveCelda(fila.enrollmentId, tipo);
          delete siguientes[clave];
        });
        return siguientes;
      });
      setCellErrors((errores) => {
        const siguientes = { ...errores };
        rows.forEach((fila) => {
          const clave = crearClaveCelda(fila.enrollmentId, tipo);
          delete siguientes[clave];
        });
        return siguientes;
      });
      if (evaluacionSeleccionada === tipo) {
        setEvaluacionSeleccionada("");
      }
      return resultado;
    });
  }

  function actualizarValorCelda(
    enrollmentId: string,
    evaluacion: GradeType,
    valor: string
  ) {
    const clave = crearClaveCelda(enrollmentId, evaluacion);
    setEditingValues((prev) => ({ ...prev, [clave]: valor }));
    setCellErrors((prev) => {
      if (!prev[clave]) return prev;
      const siguiente = { ...prev };
      delete siguiente[clave];
      return siguiente;
    });
  }

  async function guardarNota(enrollmentId: string, evaluacion: GradeType) {
    if (!cursoId) return;
    const clave = crearClaveCelda(enrollmentId, evaluacion);
    const valorIngresado = (editingValues[clave] ?? "").replace(",", ".").trim();
    if (!valorIngresado) {
      setCellErrors((prev) => ({
        ...prev,
        [clave]: "Ingresa una nota para guardar"
      }));
      return;
    }

    const valorNumerico = Number(valorIngresado);
    if (!Number.isFinite(valorNumerico)) {
      setCellErrors((prev) => ({
        ...prev,
        [clave]: "La nota debe ser un número válido"
      }));
      return;
    }

    if (valorNumerico < 1 || valorNumerico > 7) {
      setCellErrors((prev) => ({
        ...prev,
        [clave]: "La nota debe estar entre 1.0 y 7.0"
      }));
      return;
    }

    setSavingCell(clave);
    setImportSummary(null);
    try {
      await crearNota({
        enrollmentId,
        type: evaluacion,
        score: valorNumerico
      });
      await recargarNotas();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar la nota";
      setCellErrors((prev) => ({ ...prev, [clave]: message }));
    } finally {
      setSavingCell(null);
    }
  }

  function manejarKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    enrollmentId: string,
    evaluacion: GradeType
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      guardarNota(enrollmentId, evaluacion);
    }
  }

  const puedeImportar = Boolean(
    cursoId && archivo && evaluacionSeleccionada && !importing
  );

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
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 p-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-gray-700">
              Listado de participantes
            </h2>
            <p className="text-sm text-gray-500">
              Gestiona las evaluaciones directamente en la tabla y agrega nuevas
              columnas cuando lo necesites.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="nuevaEvaluacion" className="text-sm font-medium">
              Nueva evaluación
            </Label>
            <select
              id="nuevaEvaluacion"
              className="input"
              value={nuevaEvaluacion}
              onChange={(event) =>
                setNuevaEvaluacion(event.target.value as GradeType | "")
              }
              disabled={evaluacionesDisponibles.length === 0}
            >
              <option value="" disabled>
                {evaluacionesDisponibles.length === 0
                  ? "Sin tipos disponibles"
                  : "Selecciona un tipo"}
              </option>
              {evaluacionesDisponibles.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={agregarEvaluacion}
              disabled={!nuevaEvaluacion}
            >
              Agregar
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-64 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Participante
                </th>
                {evaluaciones.map((evaluacion) => (
                  <th
                    key={evaluacion}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
                  >
                    <div className="flex items-center gap-2">
                      <span>{evaluacion}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-lg leading-none text-gray-500 hover:text-red-600"
                        onClick={() => eliminarEvaluacion(evaluacion)}
                        aria-label={`Eliminar evaluación ${evaluacion}`}
                      >
                        ×
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td
                    colSpan={1 + evaluaciones.length}
                    className="px-4 py-6 text-center text-sm text-gray-500"
                  >
                    Cargando notas…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={1 + evaluaciones.length}
                    className="px-4 py-6 text-center text-sm text-gray-500"
                  >
                    No hay participantes con notas registradas todavía.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.enrollmentId} className="align-top">
                    <td className="whitespace-pre-wrap px-4 py-4 text-sm text-gray-700">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-gray-900">
                          {row.participant}
                        </span>
                        <span className="text-xs text-gray-500">
                          {row.email ? `${row.email} • ` : ""}
                          {row.enrollmentId}
                        </span>
                      </div>
                    </td>
                    {evaluaciones.map((evaluacion) => {
                      const clave = crearClaveCelda(row.enrollmentId, evaluacion);
                      const valorActual = editingValues[clave] ?? "";
                      const valorOriginal = row.grades[evaluacion]?.score ?? "";
                      const dirty = valorActual !== valorOriginal;
                      const error = cellErrors[clave];
                      const fecha = row.grades[evaluacion]?.date;
                      return (
                        <td key={clave} className="px-4 py-4 text-sm text-gray-700">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Input
                                className="h-9 w-20 text-sm"
                                value={valorActual}
                                placeholder="—"
                                onChange={(event) =>
                                  actualizarValorCelda(
                                    row.enrollmentId,
                                    evaluacion,
                                    event.target.value
                                  )
                                }
                                onKeyDown={(event) =>
                                  manejarKeyDown(
                                    event,
                                    row.enrollmentId,
                                    evaluacion
                                  )
                                }
                                disabled={savingCell === clave}
                              />
                              {savingCell === clave ? (
                                <span className="text-xs text-gray-500">
                                  Guardando…
                                </span>
                              ) : dirty ? (
                                <Button
                                  type="button"
                                  className="h-8 px-3 text-xs"
                                  variant="accent"
                                  onClick={() =>
                                    guardarNota(row.enrollmentId, evaluacion)
                                  }
                                >
                                  Guardar
                                </Button>
                              ) : null}
                            </div>
                            {error ? (
                              <span className="text-xs text-red-600">{error}</span>
                            ) : fecha ? (
                              <span className="text-xs text-gray-500">
                                Última nota: {fecha}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4 p-4">
          <h2 className="text-base font-semibold text-gray-700">
            Importar desde Excel
          </h2>
          <form className="space-y-3" onSubmit={importarNotas}>
            <div className="space-y-1">
              <Label htmlFor="evaluacionExcel">Evaluación a completar</Label>
              <select
                id="evaluacionExcel"
                className="input"
                value={evaluacionSeleccionada}
                onChange={(event) =>
                  setEvaluacionSeleccionada(event.target.value as GradeType | "")
                }
              >
                <option value="" disabled>
                  Selecciona una evaluación
                </option>
                {evaluaciones.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>
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
              {archivo && <p className="text-xs text-gray-500">{archivo.name}</p>}
            </div>
            {evaluacionSeleccionada && evaluacionSeleccionadaTieneNotas && (
              <fieldset className="space-y-2 rounded-md border border-gray-200 p-3 text-sm">
                <legend className="px-1 text-xs font-semibold uppercase text-gray-500">
                  Esta evaluación ya tiene notas
                </legend>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="modo-importacion"
                    value="missing"
                    checked={modoImportacion === "missing"}
                    onChange={() => setModoImportacion("missing")}
                  />
                  Completar sólo las notas faltantes
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="modo-importacion"
                    value="all"
                    checked={modoImportacion === "all"}
                    onChange={() => setModoImportacion("all")}
                  />
                  Reemplazar todas las notas
                </label>
              </fieldset>
            )}
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
                <strong>Resultados:</strong> {importSummary.total} procesados •{" "}
                {importSummary.created} creados • {importSummary.updated}{" "}
                actualizados • {importSummary.skipped} omitidos
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
        <Card className="space-y-2 p-4 text-sm text-gray-600">
          <h2 className="text-base font-semibold text-gray-700">
            Recomendaciones de carga
          </h2>
          <p>
            Las notas aceptan valores decimales entre <strong>1.0</strong> y{" "}
            <strong>7.0</strong>. Utiliza punto o coma como separador decimal.
          </p>
          <p>
            Puedes guardar rápidamente con{" "}
            <kbd className="rounded border border-gray-300 px-1">Enter</kbd>{" "}
            cuando termines de escribir una nota.
          </p>
        </Card>
      </div>
    </section>
  );
}
