import api from "./http";

export type SesionDTO = {
  id: string;
  courseId: string;
  date: string;
  course?: { id: string; code: string; name: string };
};

export async function listarSesionesMias() {
  const { data } = await api.get<SesionDTO[]>("/sesiones/mias");
  return data;
}

export async function crearSesion(courseId: string, date: string) {
  const { data } = await api.post<SesionDTO>("/sesiones", { courseId, date });
  return data;
}
