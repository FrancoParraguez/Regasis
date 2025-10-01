import api from "./http";
export async function reporteAsistencia(params: { from?: string; to?: string; providerId?: string }){ const { data } = await api.get("/reportes/asistencia", { params }); return data as any[]; }
export async function reporteCalificaciones(params: { from?: string; to?: string; providerId?: string }){ const { data } = await api.get("/reportes/calificaciones", { params }); return data as any[]; }
