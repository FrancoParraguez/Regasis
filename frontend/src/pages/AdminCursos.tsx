/* global HTMLFormElement, HTMLInputElement, HTMLSelectElement */

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Loader2, Plus, Settings, X } from "lucide-react";

import { Button, Card, Input, Label, Table } from "../components/ui";
import { getCurrentUser } from "../services/auth";
import { crearCurso, listarCursos, type CursoDTO } from "../services/cursos";
import { listarProveedores, type ProveedorDTO } from "../services/proveedores";

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
        setProviders(apiProveedores);
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

  return (
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
            variant={showCreateForm ? "ghost" : "primary"}
            className="items-center"
          >
            {showCreateForm ? (
              <X size={16} className="mr-2" />
            ) : (
              <Plus size={16} className="mr-2" />
            )}
            {showCreateForm ? "Cerrar" : "Nuevo curso"}
          </Button>
          <Button variant="ghost">
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
  );
}
