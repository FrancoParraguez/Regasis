import api from "./http";

export type CursoDTO = {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  providerId: string;
  senceCode?: string | null;
};

export async function listarCursos() {
  const { data } = await api.get<CursoDTO[]>("/cursos");
  return data;
}

export async function listarMisCursos() {
  const { data } = await api.get<CursoDTO[]>("/cursos/mios");
  return data;
}
