import React, { type ReactNode } from "react";
import { BookOpen, Upload, Shield, CalendarDays, CheckSquare, FileSpreadsheet, BarChart3, CircleUser } from "lucide-react";
import { useAuth } from "../../hooks/AuthProvider";

export type NavItem = { to: string; label: string; icon: ReactNode };

export function Sidebar({ route, setRoute, open }: { route: string; setRoute: (r: string) => void; open: boolean }) {
  const { user } = useAuth();
  const role = user?.role || "ADMIN";

  const nav: NavItem[] = [];
  if (role === "ADMIN")
    nav.push(
      { to: "/cursos", label: "Cursos", icon: <BookOpen size={18} /> },
      { to: "/importaciones", label: "Importaciones", icon: <Upload size={18} /> },
      { to: "/auditoria", label: "Auditoría", icon: <Shield size={18} /> }
    );
  if (role === "INSTRUCTOR" || role === "ADMIN")
    nav.push(
      { to: "/sesiones", label: "Sesiones", icon: <CalendarDays size={18} /> },
      { to: "/asistencia", label: "Asistencia", icon: <CheckSquare size={18} /> },
      { to: "/notas", label: "Notas", icon: <FileSpreadsheet size={18} /> }
    );
  if (role === "REPORTER" || role === "ADMIN")
    nav.push({ to: "/reportes", label: "Reportes", icon: <BarChart3 size={18} /> });
  nav.push({ to: "/perfil", label: "Mi Perfil", icon: <CircleUser size={18} /> });

  return (
    <aside className={`col-span-12 md:col-span-3 lg:col-span-2 ${open ? "block" : "hidden md:block"}`}>
      <div className="sticky top-4 space-y-3">
        <nav className="card p-2">
          {nav.map((item) => (
            <button key={item.to} onClick={() => setRoute(item.to)} className={`nav-btn w-full ${route === item.to ? "active" : ""}`}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="card p-4 text-sm text-gray-600">
          <div>
            Rol: <span className="font-semibold">{role}</span>
          </div>
          <div>
            Zona horaria: <span className="font-semibold">America/Santiago</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
