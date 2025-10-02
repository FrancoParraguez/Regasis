/* global HTMLFormElement, HTMLInputElement, HTMLSelectElement */

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Loader2, Plus, Settings, X } from "lucide-react";

import { Button, Card, Input, Label, Table } from "../components/ui";
import { getCurrentUser } from "../services/auth";
import { crearCurso, listarCursos, type CursoDTO } from "../services/cursos";
import {
  crearProveedor,
  listarProveedores,
  type ProveedorDTO
} from "../services/proveedores";

type CursoItem = {
  id: string;
  codigo: string;
  nombre: string;
  proveedor: string;
  fechas: string;
  instructores: string[];
};

type CursoFormState = {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  providerId: string;
};

function sortProviders(items: ProveedorDTO[]) {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function mapCurso(curso: CursoDTO): CursoItem {
  const instructorNames = (curso.instructors ?? [])
    .map((instructor) => instructor.user?.name ?? "")
    .filter((name): name is string => Boolean(name));

  return {
    id: curso.id,
    codigo: curso.code,
    nombre: curso.name,
    proveedor: curso.provider?.name ?? "—",
    fechas: `${formatDate(curso.startDate)} – ${formatDate(curso.endDate)}`,
    instructores: instructorNames,
  };
}

export default function AdminCursos() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CursoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const userProviderId = useMemo(() => getCurrentUser()?.providerId ?? "", []);
  const [providers, setProviders] = useState<ProveedorDTO[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [providerError, setProviderError] = useState<string | null>(null);
  const [providerSaving, setProviderSaving] = useState(false);

  const [formData, setFormData] = useState<CursoFormState>(() => ({
    code: "",
    name: "",
    startDate: "",
    endDate: "",
    providerId: userProviderId,
  }));

  const fallbackProviderId = useMemo(() => {
    if (providers.some((provider) => provider.id === userProviderId)) {
      return userProviderId;
    }
    return providers[0]?.id ?? "";
  }, [providers, userProviderId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const apiCursos = await listarCursos();
        if (cancelled) return;
        setItems(apiCursos.map(mapCurso));
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const apiProveedores = await listarProveedores();
        if (cancelled) return;
        setProviders(sortProviders(apiProveedores));
      } catch {
        if (!cancelled) setProviders([]);
      } finally {
        if (!cancelled) setProvidersLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setFormData((prev) => {
      if (!fallbackProviderId) {
        return prev;
      }
      if (providers.some((provider) => provider.id === prev.providerId)) {
        return prev;
      }
      return { ...prev, providerId: fallbackProviderId };
    });
  }, [fallbackProviderId, providers]);

  const cursos = useMemo(
    () =>
      items.filter((curso) =>
        (curso.codigo + curso.nombre + curso.proveedor)
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [query, items]
  );

  const updateFormField = (field: keyof CursoFormState) => (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { value } = event.target;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      startDate: "",
      endDate: "",
      providerId: fallbackProviderId,
    });
    setFormError(null);
  };

  const closeForm = () => {
    setShowCreateForm(false);
    resetForm();
  };

  const toggleCreateForm = () => {
    if (showCreateForm) {
      closeForm();
    } else {
      resetForm();
      setShowCreateForm(true);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const trimmed = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      providerId: formData.providerId.trim(),
    };

    if (!trimmed.code || !trimmed.name || !formData.startDate || !formData.endDate || !trimmed.providerId) {
      setFormError("Completa todos los campos obligatorios.");
      return;
    }

    if (providersLoading) {
      setFormError("Espera a que se carguen los proveedores disponibles.");
      return;
    }

    if (!providers.some((provider) => provider.id === trimmed.providerId)) {
      setFormError("Selecciona un proveedor válido para el curso.");
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setFormError("Ingresa fechas válidas para el curso.");
      return;
    }

    if (end < start) {
      setFormError("La fecha de término debe ser posterior al inicio.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      await crearCurso({
        code: trimmed.code,
        name: trimmed.name,
        startDate: formData.startDate,
        endDate: formData.endDate,
        providerId: trimmed.providerId,
      });

      const apiCursos = await listarCursos();
      setItems(apiCursos.map(mapCurso));
      closeForm();
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError("No se pudo crear el curso. Inténtalo nuevamente.");
      }
    } finally {
      setSaving(false);
    }
  };

  const openConfig = () => {
    setProviderName("");
    setProviderError(null);
    setShowConfig(true);
  };

  const closeConfig = () => {
    setShowConfig(false);
    setProviderName("");
    setProviderError(null);
  };

  const handleProviderSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (providerSaving) return;

    const trimmed = providerName.trim();
    if (!trimmed) {
      setProviderError("Ingresa el nombre del proveedor.");
      return;
    }

    setProviderSaving(true);
    setProviderError(null);

    try {
      const nuevoProveedor = await crearProveedor({ name: trimmed });
      setProviders((prev) =>
        sortProviders([
          ...prev.filter((provider) => provider.id !== nuevoProveedor.id),
          nuevoProveedor
        ])
      );
      setProviderName("");
      setFormData((prev) => ({ ...prev, providerId: nuevoProveedor.id }));
    } catch (error) {
      if (error instanceof Error) {
        setProviderError(error.message);
      } else {
        setProviderError("No se pudo crear el proveedor. Inténtalo nuevamente.");
      }
    } finally {
      setProviderSaving(false);
    }
  };

  return (
    <>
      <section className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Cursos</h1>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar cursos…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button
              type="button"
              onClick={toggleCreateForm}
              aria-expanded={showCreateForm}
              aria-pressed={showCreateForm}
              className="items-center"
            >
              {showCreateForm ? (
                <X size={16} className="mr-2" />
              ) : (
                <Plus size={16} className="mr-2" />
              )}
              {showCreateForm ? "Cerrar" : "Nuevo curso"}
            </Button>
            <Button type="button" variant="ghost" onClick={openConfig}>
              <Settings size={16} /> Configuración
            </Button>
          </div>
        </header>

        {showCreateForm ? (
          <Card className="p-4">
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* campos del formulario */}
              {/* ... */}
            </form>
          </Card>
        ) : null}

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 space-y-4 md:col-span-8 lg:col-span-9">
            {loading ? (
              <Card className="p-4 text-sm text-gray-600">Cargando…</Card>
            ) : null}
            <Table
              columns={["Código", "Nombre", "Proveedor", "Fechas", "Instructores", "Acciones"]}
              rows={cursos.map((curso) => [
                <span className="font-medium" key={curso.id}>{curso.codigo}</span>,
                curso.nombre,
                curso.proveedor,
                curso.fechas,
                <span key={`${curso.id}-i`} className="text-gray-600">
                  {curso.instructores.length > 0 ? curso.instructores.join(", ") : "—"}
                </span>,
                <div key={`${curso.id}-a`} className="flex gap-2">
                  <Button variant="ghost">Editar</Button>
                  <Button variant="ghost" className="text-red-600">Eliminar</Button>
                </div>
              ])}
            />
          </div>
          {/* sidebar de estadísticas */}
        </div>
      </section>

      {/* Modal de configuración */}
      {showConfig ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-6"
             role="dialog" aria-modal="true" onClick={closeConfig}>
          <Card className="relative z-10 w-full max-w-xl space-y-6 p-6"
                onClick={(event) => event.stopPropagation()}>
            {/* ... contenido del modal ... */}
          </Card>
        </div>
      ) : null}
    </>
  );
}
