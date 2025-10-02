import api from "./http";

export type ProveedorDTO = {
  id: string;
  name: string;
};

export async function listarProveedores() {
  const { data } = await api.get<ProveedorDTO[]>("/proveedores");
  return data;
}
