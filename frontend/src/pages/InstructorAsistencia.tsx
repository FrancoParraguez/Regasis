import { useEffect, useState } from "react";

import { Button, Input, Table } from "../components/ui";
import {
  obtenerAsistencia,
  guardarAsistencia,
  type AttendanceItemDTO,
  type AttendanceState
} from "../services/asistencias";
import { listarSesionesMias } from "../services/sesiones";

type SessionOption = { id: string; label: string };

type AttendanceRow = AttendanceItemDTO & { observation?: string | null };

const attendanceStates: AttendanceState[] = [
  "PRESENTE",
  "AUSENTE",
  "JUSTIFICADO",
  "TARDANZA",
  "SALIDA_ANTICIPADA"
];

export default function InstructorAsistencia() {
  const [sessionId, setSessionId] = useState<string>("");
  const [sesiones, setSesiones] = useState<SessionOption[]>([]);
  const [data, setData] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sessions = await listarSesionesMias();
      if (cancelled) return;
      const mapped = sessions.map<SessionOption>((session) => ({
        id: session.id,
        label: `${session.course?.code ?? ""} • ${session.date.slice(0, 10)}`
      }));
      setSesiones(mapped);
      if (mapped[0]) setSessionId(mapped[0].id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const attendance = await obtenerAsistencia(sessionId);
        if (!cancelled) setData(attendance);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function save() {
    const items = data.map((item) => ({
      enrollmentId: item.enrollment.id,
      state: item.state as AttendanceState,
      observation: item.observation ?? undefined
    }));
    await guardarAsistencia(sessionId, items);
  }

  const columns = ["Participante", "Curso", "Estado", "Obs."];
  const rows = data.map((item) => [
    <div key={item.id} className="flex items-center gap-2">
      <span className="dot" />
      <span className="font-medium">{item.enrollment.participant.name}</span>
    </div>,
    item.enrollment.course.code,
    <select
      key={`${item.enrollment.id}-state`}
      className="input"
      value={item.state}
      onChange={(event) =>
        setData((previous) =>
          previous.map((entry) =>
            entry.enrollment.id === item.enrollment.id
              ? {
                  ...entry,
                  state: event.target.value as AttendanceState
                }
              : entry
          )
        )
      }
    >
      {attendanceStates.map((state) => (
        <option key={state} value={state}>
          {state}
        </option>
      ))}
    </select>,
    <Input
      key={`${item.enrollment.id}-obs`}
      value={item.observation ?? ""}
      onChange={(event) =>
        setData((previous) =>
          previous.map((entry) =>
            entry.enrollment.id === item.enrollment.id
              ? { ...entry, observation: event.target.value }
              : entry
          )
        )
      }
    />
  ]);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Asistencia</h1>
        <div className="flex items-center gap-2">
          <select
            className="input"
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
          >
            {sesiones.map((session) => (
              <option key={session.id} value={session.id}>
                {session.label}
              </option>
            ))}
          </select>
          <Button onClick={save} disabled={!data.length || loading}>
            {loading ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </header>
      <Table columns={columns} rows={rows} />
    </section>
  );
}
