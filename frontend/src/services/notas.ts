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

export type GradeCountOption = {
  /**
   * Número de notas configurables para el curso.
   */
  value: number;
  /**
   * Etiqueta amigable para mostrar en selectores.
   */
  label: string;
  /**
   * Indica si la opción corresponde al valor predeterminado.
   */
  default?: boolean;
};

export type GradeImportSummary = {
  /** Total de registros procesados durante la carga. */
  total: number;
  /** Cantidad de registros creados. */
  created: number;
  /** Cantidad de registros actualizados. */
  updated: number;
  /** Cantidad de registros omitidos. */
  skipped: number;
  /** Listado de errores asociados a filas específicas. */
  errors: string[];
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

export async function listarCantidadNotas(courseId: string) {
  const { data } = await api.get<GradeCountOption[]>(
    `/notas/course/${courseId}/cantidad`
  );
  return data;
}

type CargarNotasOptions = {
  /** Cantidad de notas que el usuario desea cargar. */
  cantidad: number;
  /**
   * Callback opcional para informar progreso en formato de porcentaje
   * (0 a 100).
   */
  onProgress?: (percentage: number) => void;
};

export async function cargarNotasDesdeArchivo(
  courseId: string,
  file: File,
  { cantidad, onProgress }: CargarNotasOptions
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("cantidad", String(cantidad));

  const { data } = await api.post<GradeImportSummary>(
    `/notas/course/${courseId}/importar`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (!event.total || !onProgress) return;
        const percentage = Math.round((event.loaded / event.total) * 100);
        onProgress(percentage);
      }
    }
  );

  return data;
}
