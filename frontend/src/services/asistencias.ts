import api from "./http";

export type AttendanceState =
  | "PRESENTE"
  | "AUSENTE"
  | "JUSTIFICADO"
  | "TARDANZA"
  | "SALIDA_ANTICIPADA";

export type AttendanceItemDTO = {
  id: string;
  state: AttendanceState;
  observation?: string | null;
  enrollment: {
    id: string;
    participant: {
      id: string;
      name: string;
      email?: string | null;
    };
    course: {
      id: string;
      code: string;
      name: string;
    };
  };
};

export async function obtenerAsistencia(sessionId: string) {
  const { data } = await api.get<AttendanceItemDTO[]>(`/asistencias/session/${sessionId}`);
  return data;
}

export async function guardarAsistencia(
  sessionId: string,
  items: { enrollmentId: string; state: AttendanceState; observation?: string }[],
) {
  const { data } = await api.post(`/asistencias/session/${sessionId}`, { items });
  return data as { updated: number };
}
