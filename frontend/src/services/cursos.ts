import { isAxiosError } from "axios";

import api from "./http";

type CursoInstructorDTO = {
  user: {
    id: string;
    name: string | null;
  } | null;
};

type CursoProviderDTO = {
  id: string;
  name: string | null;
} | null;

export type CursoDTO = {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  providerId: string;
  provider?: CursoProviderDTO;
  instructors?: CursoInstructorDTO[];
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

export type CrearCursoInput = {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  providerId: string;
  instructorIds?: string[];
};

export async function crearCurso(input: CrearCursoInput) {
  try {
    const { data } = await api.post<CursoDTO>("/cursos", input);
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message =
        (typeof error.response?.data === "object" && error.response?.data && "error" in error.response.data
          ? (error.response.data as { error?: string }).error
          : null) ?? "No se pudo crear el curso. Inténtalo nuevamente.";
      throw new Error(message);
    }
    throw error;
  }
}
