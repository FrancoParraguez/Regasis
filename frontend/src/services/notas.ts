import api from "./http";

export type GradeType = "P1" | "P2" | "EXAMEN" | "PRACTICA" | "OTRO";

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

export async function listarNotasPorCurso(courseId: string) {
  const { data } = await api.get<GradeDTO[]>(`/notas/course/${courseId}`);
  return data;
}

export async function crearNota(input: { enrollmentId: string; type: GradeType; score: number; date?: string }) {
  const { data } = await api.post<GradeDTO>("/notas", input);
  return data;
}
