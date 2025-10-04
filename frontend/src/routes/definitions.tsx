import type { ReactElement } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  CircleUser,
  FileSpreadsheet,
  Shield,
} from "lucide-react";

import AdminAuditoria from "../pages/AdminAuditoria";
import AdminCursos from "../pages/AdminCursos";
import InstructorAsistencia from "../pages/InstructorAsistencia";
import InstructorNotas from "../pages/InstructorNotas";
import InstructorSesiones from "../pages/InstructorSesiones";
import Perfil from "../pages/Perfil";
import Reporteria from "../pages/Reporteria";

export type Role = "ADMIN" | "INSTRUCTOR" | "REPORTER";

export type AppRoute = {
  path: string;
  element: ReactElement;
  roles: Role[];
  label?: string;
  icon?: LucideIcon;
};

export const DEFAULT_ROUTE: Record<Role, string> = {
  ADMIN: "/cursos",
  INSTRUCTOR: "/asistencia",
  REPORTER: "/reportes",
};

export const APP_ROUTES: AppRoute[] = [
  {
    path: "/cursos",
    element: <AdminCursos />,
    roles: ["ADMIN"],
    label: "Cursos",
    icon: BookOpen,
  },
  {
    path: "/auditoria",
    element: <AdminAuditoria />,
    roles: ["ADMIN"],
    label: "Auditoría",
    icon: Shield,
  },
  {
    path: "/sesiones",
    element: <InstructorSesiones />,
    roles: ["ADMIN", "INSTRUCTOR"],
    label: "Sesiones",
    icon: CalendarDays,
  },
  {
    path: "/asistencia",
    element: <InstructorAsistencia />,
    roles: ["ADMIN", "INSTRUCTOR"],
    label: "Asistencia",
    icon: CheckSquare,
  },
  {
    path: "/notas",
    element: <InstructorNotas />,
    roles: ["ADMIN", "INSTRUCTOR"],
    label: "Notas",
    icon: FileSpreadsheet,
  },
  {
    path: "/reportes",
    element: <Reporteria />,
    roles: ["ADMIN", "REPORTER"],
    label: "Reportes",
    icon: BarChart3,
  },
  {
    path: "/perfil",
    element: <Perfil />,
    roles: ["ADMIN", "INSTRUCTOR", "REPORTER"],
    label: "Mi Perfil",
    icon: CircleUser,
  },
];
