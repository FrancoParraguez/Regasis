import api from "./http";

export type GradeType = string;

export type GradeDTO = {
  id: string;
  enrollmentId: string;
  type: GradeType;
  score: number;
  date: string;
  enrollment?: {
    participant: { name: string; email?: string | null };
  };
};

type ListarNotasOptions = {
  /** Página a solicitar (base 1). */
  page?: number;
  /** Cantidad de notas por página. */
  pageSize?: number;
};

export async function listarNotasPorCurso(courseId: string, options: ListarNotasOptions = {}) {
  const params: Record<string, string> = {};
  if (options.page != null) params.page = String(options.page);
  if (options.pageSize != null) params.pageSize = String(options.pageSize);
  const { data } = await api.get<GradeDTO[]>(`/notas/course/${courseId}`, {
    params: Object.keys(params).length ? params : undefined
  });
  return data;
}

export async function crearNota(input: { enrollmentId: string; type: GradeType; score: number; date?: string }) {
  const { data } = await api.post<GradeDTO>("/notas", input);
  return data;
}

