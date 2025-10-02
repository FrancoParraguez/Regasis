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

export default function InstructorNotas() {
  const { user } = useAuth();
  const [cursoId, setCursoId] = useState<string>("");
  const [cursos, setCursos] = useState<CursoOption[]>([]);
  const [busquedaCurso, setBusquedaCurso] = useState("");
  const [busquedaCursoInput, setBusquedaCursoInput] = useState("");
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
  const [filtroFechaInicioInput, setFiltroFechaInicioInput] = useState("");
  const [filtroFechaFin, setFiltroFechaFin] = useState("");
  const [filtroFechaFinInput, setFiltroFechaFinInput] = useState("");
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
  const [nuevaEvaluacion, setNuevaEvaluacion] = useState("");
  const [evaluacionSeleccionada, setEvaluacionSeleccionada] = useState<
    GradeType | ""
  >("");
  const [modoImportacion, setModoImportacion] = useState<GradeUpdateMode>(
    "missing"
  );
  const evaluationSuggestions = useMemo(() => {
    const sugerencias = Array.from({ length: 10 }, (_, index) => `Ev ${index + 1}`);
    return [...sugerencias, "EXAMEN"];
  }, []);

  const cursosFiltrados = useMemo(() => {
    const termino = busquedaCurso.trim().toLowerCase();
    const inicio = filtroFechaInicio ? new Date(filtroFechaInicio) : null;
    const fin = filtroFechaFin ? new Date(filtroFechaFin) : null;

    return cursos.filter((curso) => {
      const campos = [curso.code, curso.name, curso.senceCode ?? ""];
      if (termino) {
        const coincideTexto = campos.some((campo) =>
          campo.toLowerCase().includes(termino)
        );
        const coincideFechas = [curso.startDate, curso.endDate]
          .filter(Boolean)
          .some((valor) => valor.toLowerCase().includes(termino));
        if (!coincideTexto && !coincideFechas) {
          return false;
        }
      }

      const fechaInicioCurso = curso.startDate ? new Date(curso.startDate) : null;
      const fechaFinCurso = curso.endDate ? new Date(curso.endDate) : null;

      if (inicio && fechaInicioCurso && fechaInicioCurso < inicio) {
        return false;
      }
      if (fin && fechaFinCurso && fechaFinCurso > fin) {
        return false;
      }

      return true;
    });
  }, [busquedaCurso, cursos, filtroFechaFin, filtroFechaInicio]);

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
        setCursoId((prev) => (prev && mapped.some((curso) => curso.id === prev) ? prev : mapped[0].id));
      } else {
        setCursoId("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  useEffect(() => {
    if (cursosFiltrados.length === 0) {
      if (cursoId !== "") {
        setCursoId("");
      }
      return;
    }
    if (!cursoId || !cursosFiltrados.some((curso) => curso.id === cursoId)) {
      setCursoId(cursosFiltrados[0].id);
    }
  }, [cursoId, cursosFiltrados]);

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

  const evaluacionSeleccionadaTieneNotas = useMemo(() => {
    if (!evaluacionSeleccionada) return false;
    return rows.some((row) => Boolean(row.grades[evaluacionSeleccionada]?.score));
  }, [rows, evaluacionSeleccionada]);

  const nuevaEvaluacionNormalizada = nuevaEvaluacion.trim();
  const esEvaluacionDuplicada =
    nuevaEvaluacionNormalizada.length > 0 &&
    evaluaciones.some(
      (tipo) => tipo.toLowerCase() === nuevaEvaluacionNormalizada.toLowerCase()
    );

  function crearClaveCelda(enrollmentId: string, evaluacion: GradeType) {
    return `${enrollmentId}::${evaluacion}`;
  }

  function construirFilas(data: GradeDTO[]) {
    const porInscripcion = new Map<string, EnrollmentRow>();
    const tiposEnDatos: GradeType[] = [];
    const tiposRegistrados = new Set<string>();

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

      const tipo = (nota.type?.trim() || "EXAMEN") as GradeType;
      const claveTipo = tipo.toLowerCase();
      if (!tiposRegistrados.has(claveTipo)) {
        tiposRegistrados.add(claveTipo);
        tiposEnDatos.push(tipo);
      }

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

    return { filasOrdenadas, evaluacionesDesdeDatos: tiposEnDatos };
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

    const evaluacionesFinales = (() => {
      const existentes = [...evaluaciones];
      const clavesExistentes = new Set(
        existentes.map((tipo) => tipo.toLowerCase())
      );
      evaluacionesDesdeDatos.forEach((tipo) => {
        const clave = tipo.toLowerCase();
        if (!clavesExistentes.has(clave)) {
          clavesExistentes.add(clave);
          existentes.push(tipo);
        }
      });
      if (existentes.length === 0) {
        return evaluacionesDesdeDatos.length > 0
          ? evaluacionesDesdeDatos
          : ["EXAMEN"];
      }
      return existentes;
    })();

    setRows(filasOrdenadas);
    setEvaluaciones(evaluacionesFinales);
    setEditingValues(construirValoresEdicion(filasOrdenadas, evaluacionesFinales));

    if (
      evaluacionSeleccionada &&
      !evaluacionesFinales.some(
        (tipo) => tipo.toLowerCase() === evaluacionSeleccionada.toLowerCase()
      )
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
      const summary = await cargarNotasDesdeArchivo(
        cursoId,
        archivo,
        {
          evaluation: evaluacionSeleccionada,
          mode: modoImportacion,
          onProgress: setImportProgress
        }
      );
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
    const etiqueta = nuevaEvaluacionNormalizada;
    if (!etiqueta) return;
    const clave = etiqueta.toLowerCase();
    const existe = evaluaciones.some(
      (tipo) => tipo.toLowerCase() === clave
    );
    if (existe) {
      setNuevaEvaluacion("");
      return;
    }

    const siguientes = [...evaluaciones, etiqueta];
    setEvaluaciones(siguientes);
    setEditingValues((valores) => {
      const siguientesValores = { ...valores };
      rows.forEach((fila) => {
        const claveCelda = crearClaveCelda(fila.enrollmentId, etiqueta);
        if (!(claveCelda in siguientesValores)) {
          siguientesValores[claveCelda] = "";
        }
      });
      return siguientesValores;
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
        error instanceof Error
          ? error.message
          : "No se pudo guardar la nota";
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

  function manejarBusquedaCursos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusquedaCurso(busquedaCursoInput);
    setFiltroFechaInicio(filtroFechaInicioInput);
    setFiltroFechaFin(filtroFechaFinInput);
  }

  const puedeImportar = Boolean(
    cursoId && archivo && evaluacionSeleccionada && !importing
  );

  return (
    <section className="space-y-4">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Notas</h1>
        </div>
        <form
          onSubmit={manejarBusquedaCursos}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div className="space-y-1">
            <Label htmlFor="busquedaCurso" className="text-sm font-medium">
              Buscar curso
            </Label>
            <Input
              id="busquedaCurso"
              value={busquedaCursoInput}
              onChange={(event) => setBusquedaCursoInput(event.target.value)}
              placeholder="Código interno, código SENCE o nombre"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filtroFechaInicio" className="text-sm font-medium">
              Inicio desde
            </Label>
            <Input
              id="filtroFechaInicio"
              type="date"
              value={filtroFechaInicioInput}
              onChange={(event) =>
                setFiltroFechaInicioInput(event.target.value)
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filtroFechaFin" className="text-sm font-medium">
              Término hasta
            </Label>
            <Input
              id="filtroFechaFin"
              type="date"
              value={filtroFechaFinInput}
              onChange={(event) => setFiltroFechaFinInput(event.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-2">
            <Label htmlFor="selectorCurso" className="text-sm font-medium">
              Selecciona un curso
            </Label>
            <select
              id="selectorCurso"
              className="input"
              value={cursoId}
              onChange={(event) => setCursoId(event.target.value)}
              disabled={cursosFiltrados.length === 0}
            >
              {cursosFiltrados.length === 0 ? (
                <option value="">Sin cursos disponibles</option>
              ) : (
                cursosFiltrados.map((curso) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.code}
                    {curso.senceCode ? ` • SENCE ${curso.senceCode}` : ""}
                    {curso.name ? ` • ${curso.name}` : ""}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flex items-end pt-1 sm:col-span-2 lg:col-span-1">
            <Button type="submit" className="w-full sm:w-auto">
              Buscar
            </Button>
          </div>
        </form>
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
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="nuevaEvaluacion" className="text-sm font-medium">
                Nueva evaluación
              </Label>
              <Input
                id="nuevaEvaluacion"
                list="evaluaciones-sugeridas"
                className="min-w-[12rem]"
                value={nuevaEvaluacion}
                onChange={(event) => setNuevaEvaluacion(event.target.value)}
                placeholder="Ej: Ev 1, EXAMEN"
              />
              <datalist id="evaluaciones-sugeridas">
                {evaluationSuggestions.map((sugerencia) => (
                  <option key={sugerencia} value={sugerencia} />
                ))}
              </datalist>
              {esEvaluacionDuplicada ? (
                <p className="text-xs text-red-600">
                  Ya existe una evaluación con este nombre.
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              onClick={agregarEvaluacion}
              disabled={!nuevaEvaluacionNormalizada || esEvaluacionDuplicada}
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
          <h2 className="text-base font-semibold text-gray-700">Importar desde Excel</h2>
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
              {archivo && (
                <p className="text-xs text-gray-500">{archivo.name}</p>
              )}
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
        <Card className="space-y-2 p-4 text-sm text-gray-600">
          <h2 className="text-base font-semibold text-gray-700">
            Recomendaciones de carga
          </h2>
          <p>
            Las notas aceptan valores decimales entre <strong>1.0</strong> y <strong>7.0</strong>.
            Utiliza punto o coma como separador decimal.
          </p>
          <p>
            Puedes guardar rápidamente con <kbd className="rounded border border-gray-300 px-1">Enter</kbd> cuando termines de escribir una nota.
          </p>
        </Card>
      </div>
    </section>
  );
}
