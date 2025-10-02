import api from "./http";

export type ImportSummary = {
  created: number;
  updated: number;
  errors: string[];
  total: number;
};

export async function importarParticipantes(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<ImportSummary>("/importaciones/participantes", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data;
}

export async function descargarPlantillaParticipantes() {
  const response = await api.get<Blob>("/importaciones/participantes/plantilla", {
    responseType: "blob",
  });

  return response.data;
}
