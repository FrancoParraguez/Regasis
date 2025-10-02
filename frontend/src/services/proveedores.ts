import { isAxiosError } from "axios";
import api from "./http";

export type ProveedorDTO = {
  id: string;
  name: string;
};

export async function listarProveedores() {
  const { data } = await api.get<ProveedorDTO[]>("/proveedores");
  return data;
}

export async function crearProveedor(input: { name: string }) {
  try {
    const { data } = await api.post<ProveedorDTO>("/proveedores", input);
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message =
        (typeof error.response?.data === "object" &&
        error.response?.data &&
        "error" in error.response.data
          ? (error.response.data as { error?: string }).error
          : null) ?? "No se pudo crear el proveedor. Inténtalo nuevamente.";
      throw new Error(message);
    }
    throw error;
  }
}
