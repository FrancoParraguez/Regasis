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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="nuevo-curso-codigo">Código</Label>
                  <Input
                    id="nuevo-curso-codigo"
                    value={formData.code}
                    onChange={updateFormField("code")}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="nuevo-curso-nombre">Nombre</Label>
                  <Input
                    id="nuevo-curso-nombre"
                    value={formData.name}
                    onChange={updateFormField("name")}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nuevo-curso-inicio">Fecha de inicio</Label>
                  <Input
                    id="nuevo-curso-inicio"
                    type="date"
                    value={formData.startDate}
                    onChange={updateFormField("startDate")}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nuevo-curso-fin">Fecha de término</Label>
                  <Input
                    id="nuevo-curso-fin"
                    type="date"
                    value={formData.endDate}
                    onChange={updateFormField("endDate")}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="nuevo-curso-proveedor">Proveedor</Label>
                  <select
                    id="nuevo-curso-proveedor"
                    className="input"
                    value={formData.providerId}
                    onChange={updateFormField("providerId")}
                    disabled={providersLoading || providers.length === 0}
                  >
                    <option value="" disabled>
                      {providersLoading ? "Cargando proveedores…" : "Selecciona un proveedor"}
                    </option>
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                  {!providersLoading && providers.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No hay proveedores disponibles. Crea un proveedor antes de registrar un curso.
                    </p>
                  ) : null}
                </div>
              </div>

              {formError ? (
                <p className="text-sm text-red-600">{formError}</p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={closeForm} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || providersLoading || providers.length === 0}>
                  {saving ? <Loader2 className="mr-2 animate-spin" size={16} /> : null}
                  Guardar curso
                </Button>
              </div>
            </form>
          </Card>
        ) : null}

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 space-y-4 md:col-span-8 lg:col-span-9">
            {loading ? (
              <Card className="p-4 text-sm text-gray-600">Cargando…</Card>
            ) : null}
            <Table
              columns={[
                "Código",
                "Nombre",
                "Proveedor",
                "Fechas",
                "Instructores",
                "Acciones"
              ]}
              rows={cursos.map((curso) => [
                <span className="font-medium" key={curso.id}>
                  {curso.codigo}
                </span>,
                curso.nombre,
                curso.proveedor,
                curso.fechas,
                <span key={`${curso.id}-i`} className="text-gray-600">
                  {curso.instructores.length > 0 ? curso.instructores.join(", ") : "—"}
                </span>,
                <div key={`${curso.id}-a`} className="flex gap-2">
                  <Button variant="ghost">Editar</Button>
                  <Button variant="ghost" className="text-red-600">
                    Eliminar
                  </Button>
                </div>
              ])}
            />
          </div>
          <div className="col-span-12 space-y-4 md:col-span-4 lg:col-span-3">
            <Card className="p-4">
              <div className="text-sm text-gray-500">Cursos activos</div>
              <div className="mt-1 text-2xl font-bold">{items.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-500">Instructores</div>
              <div className="mt-1 text-2xl font-bold">3</div>
              <div className="mt-2 text-xs text-gray-500">
                Promedio 1.5 por curso
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-semibold">Validaciones clave</div>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>
                  <span className="dot" /> Código de curso único
                </li>
                <li>
                  <span className="dot" /> Soft delete recomendado
                </li>
                <li>
                  <span className="dot" /> Confirmar si tiene clases
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {showConfig ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-6"
          role="dialog"
          aria-modal="true"
          onClick={closeConfig}
        >
          <Card
            className="relative z-10 w-full max-w-xl space-y-6 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Configuración</h2>
                <p className="text-sm text-gray-600">
                  Gestiona los proveedores disponibles para los cursos.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={closeConfig}
                aria-label="Cerrar configuración"
              >
                <X size={16} />
              </Button>
            </header>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Proveedores registrados
              </h3>
              {providersLoading ? (
                <p className="text-sm text-gray-600">Cargando proveedores…</p>
              ) : providers.length === 0 ? (
                <p className="text-sm text-gray-600">
                  Aún no hay proveedores registrados.
                </p>
              ) : (
                <ul className="space-y-2 text-sm text-gray-700">
                  {providers.map((provider) => (
                    <li key={provider.id} className="flex items-center justify-between">
                      <span>{provider.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <form className="space-y-3" onSubmit={handleProviderSubmit}>
              <div className="space-y-1">
                <Label htmlFor="config-nuevo-proveedor">Nuevo proveedor</Label>
                <Input
                  id="config-nuevo-proveedor"
                  value={providerName}
                  onChange={(event) => setProviderName(event.target.value)}
                  placeholder="Nombre del proveedor"
                  autoComplete="off"
                />
              </div>
              {providerError ? (
                <p className="text-sm text-red-600">{providerError}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={closeConfig} disabled={providerSaving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={providerSaving}>
                  {providerSaving ? <Loader2 className="mr-2 animate-spin" size={16} /> : null}
                  Guardar proveedor
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </>
  );
}
