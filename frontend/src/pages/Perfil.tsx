import { useMemo } from "react";

import { Card, Input, Label } from "../components/ui";
import { useAuth } from "../hooks/AuthProvider";
import { APP_ROUTES, type Role } from "../routes/definitions";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  INSTRUCTOR: "Instructor",
  REPORTER: "Reportero",
};

export default function Perfil() {
  const { user } = useAuth();
  const role = (user?.role ?? "ADMIN") as Role;

  const allowedRoutes = useMemo(
    () =>
      APP_ROUTES.filter((route) => route.roles.includes(role) && route.label).map((route) => ({
        path: route.path,
        label: route.label!,
      })),
    [role],
  );

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Mi Perfil</h1>
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="profile-name">Nombre</Label>
            <Input id="profile-name" defaultValue={user?.name || "Usuario"} />
          </div>
          <div>
            <Label htmlFor="profile-email">Correo</Label>
            <Input id="profile-email" defaultValue={user?.email || ""} />
          </div>
          <div>
            <Label htmlFor="profile-role">Rol</Label>
            <Input id="profile-role" defaultValue={ROLE_LABEL[role]} readOnly />
          </div>
          <div>
            <Label htmlFor="profile-provider">Proveedor</Label>
            <Input id="profile-provider" defaultValue={user?.providerId || ""} readOnly />
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-sm font-semibold">Vistas disponibles para tu rol</div>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          {allowedRoutes.map((route) => (
            <li key={route.path} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              <span>{route.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Si necesitas permisos adicionales ponte en contacto con el equipo de soporte.
        </p>
      </Card>
    </section>
  );
}
