/* global HTMLFormElement */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Button, Card, Input, Label, Table } from "../components/ui";
import { listarMisCursos, type CursoDTO } from "../services/cursos";
import { crearSesion, listarSesionesMias, type SesionDTO } from "../services/sesiones";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString();
}

function todayISODate() {
  const today = new Date();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

export default function InstructorSesiones() {
  const [sessions, setSessions] = useState<SesionDTO[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [courses, setCourses] = useState<CursoDTO[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [sessionDate, setSessionDate] = useState(todayISODate);
  const [formError, setFormError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const data = await listarSesionesMias();
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listarMisCursos();
        if (cancelled) return;
        setCourses(data);
      } catch {
        if (!cancelled) setCourses([]);
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelectedCourseId((prev) => {
      if (prev && courses.some((course) => course.id === prev)) {
        return prev;
      }
      return courses[0]?.id ?? "";
    });
  }, [courses]);

  const toggleCreateForm = () => {
    if (showCreateForm) {
      setShowCreateForm(false);
      setFormError(null);
    } else {
      setSessionDate(todayISODate());
      setFormError(null);
      setShowCreateForm(true);
    }
  };

  const closeForm = () => {
    setShowCreateForm(false);
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating) return;

    const trimmedCourseId = selectedCourseId.trim();
    if (!trimmedCourseId) {
      setFormError("Selecciona un curso para iniciar la sesión.");
      return;
    }

    if (!courses.some((course) => course.id === trimmedCourseId)) {
      setFormError("Selecciona un curso válido.");
      return;
    }

    const date = new Date(sessionDate);
    if (Number.isNaN(date.getTime())) {
      setFormError("Selecciona una fecha válida.");
      return;
    }

    setCreating(true);
    setFormError(null);
    try {
      await crearSesion(trimmedCourseId, date.toISOString());
      await loadSessions();
      setShowCreateForm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear la sesión.";
      setFormError(message);
    } finally {
      setCreating(false);
    }
  };

  const rows = useMemo(() => {
    if (loadingSessions) {
      return [["Cargando…", "", "", ""]];
    }

    if (sessions.length === 0) {
      return [["Sin sesiones", "", "", ""]];
    }

    return sessions.map((session) => [
      formatDate(session.date),
      session.course?.code ?? "—",
      session.course?.name ?? "—",
      <Button key={session.id} variant="ghost">Abrir</Button>
    ]);
  }, [loadingSessions, sessions]);

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sesiones</h1>
        <Button aria-expanded={showCreateForm} onClick={toggleCreateForm}>
          {showCreateForm ? "Cerrar" : "Nueva sesión"}
        </Button>
      </header>

      {showCreateForm ? (
        <Card className="p-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="session-course">Curso</Label>
              <select
                id="session-course"
                className="select select-bordered w-full"
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                disabled={coursesLoading || courses.length === 0}
              >
                {coursesLoading && <option>Cargando cursos…</option>}
                {!coursesLoading && courses.length === 0 && <option>No hay cursos disponibles</option>}
                {!coursesLoading &&
                  courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} — {course.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-date">Fecha</Label>
              <Input
                id="session-date"
                type="date"
                value={sessionDate}
                max="9999-12-31"
                onChange={(event) => setSessionDate(event.target.value)}
              />
            </div>

            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeForm}>
                Cancelar
              </Button>
              <Button disabled={creating || coursesLoading || courses.length === 0} type="submit">
                {creating ? "Guardando…" : "Crear sesión"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Table columns={["Fecha", "Código", "Curso", "Acciones"]} rows={rows} />
    </section>
  );
}
