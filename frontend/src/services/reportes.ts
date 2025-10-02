import api from "./http";

export type AttendanceReportDTO = {
  session?: {
    course?: { code?: string | null } | null;
    date?: string | null;
  } | null;
  enrollment?: {
    participant?: { name?: string | null } | null;
  } | null;
  state?: string | null;
  observation?: string | null;
};

export type GradeReportDTO = {
  enrollment?: {
    course?: { code?: string | null } | null;
    participant?: { name?: string | null } | null;
  } | null;
  type?: string | null;
  score?: number | null;
  date?: string | null;
};

export async function reporteAsistencia(params: { from?: string; to?: string; providerId?: string }) {
  const { data } = await api.get<AttendanceReportDTO[]>("/reportes/asistencia", { params });
  return data;
}

export async function reporteCalificaciones(params: { from?: string; to?: string; providerId?: string }) {
  const { data } = await api.get<GradeReportDTO[]>("/reportes/calificaciones", { params });
  return data;
}
