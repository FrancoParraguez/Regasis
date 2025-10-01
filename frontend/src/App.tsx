import React, { useEffect, useMemo, useState } from "react";
import { Topbar } from "./components/layout/Topbar";
import { Sidebar } from "./components/layout/Sidebar";
import AdminCursos from "./pages/AdminCursos";
import AdminImportaciones from "./pages/AdminImportaciones";
import AdminAuditoria from "./pages/AdminAuditoria";
import InstructorSesiones from "./pages/InstructorSesiones";
import InstructorAsistencia from "./pages/InstructorAsistencia";
import InstructorNotas from "./pages/InstructorNotas";
import Reporteria from "./pages/Reporteria";
import Perfil from "./pages/Perfil";
import Login from "./pages/Login";
import { useAuth } from "./hooks/AuthProvider";

function canAccess(route: string, role: "ADMIN"|"INSTRUCTOR"|"REPORTER"): boolean {
  const adminRoutes = ["/cursos","/importaciones","/auditoria"];
  const instructorRoutes = ["/sesiones","/asistencia","/notas"];
  const reporterRoutes = ["/reportes"];
  if(adminRoutes.includes(route)) return role === "ADMIN";
  if(instructorRoutes.includes(route)) return role === "INSTRUCTOR" || role === "ADMIN";
  if(reporterRoutes.includes(route)) return role === "REPORTER" || role === "ADMIN";
  return true;
}

export default function App(){
  const [route, setRoute] = useState<string>("/cursos");
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const role = (user?.role || "ADMIN") as "ADMIN"|"INSTRUCTOR"|"REPORTER";

  useEffect(() => {
    if(!user) return;
    if(!canAccess(route, role)){
      const fallback = role === "ADMIN" ? "/cursos" : role === "INSTRUCTOR" ? "/asistencia" : "/reportes";
      setRoute(fallback);
    }
  }, [route, role, user]);

  const page = useMemo(() => {
    if(!canAccess(route, role)) return (
      <div className="card p-6 text-sm text-gray-700">403 · No tienes permisos para acceder a esta sección.</div>
    );
    if(route === "/cursos") return <AdminCursos/>;
    if(route === "/importaciones") return <AdminImportaciones/>;
    if(route === "/auditoria") return <AdminAuditoria/>;
    if(route === "/sesiones") return <InstructorSesiones/>;
    if(route === "/asistencia") return <InstructorAsistencia/>;
    if(route === "/notas") return <InstructorNotas/>;
    if(route === "/reportes") return <Reporteria/>;
    if(route === "/perfil") return <Perfil/>;
    return null;
  }, [route, role]);

  if(!user) return <Login/>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Topbar onMenu={()=>setMenuOpen(v=>!v)} />
      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-4 p-4">
        <Sidebar route={route} setRoute={setRoute} open={menuOpen} />
        <main className="col-span-12 md:col-span-9 lg:col-span-10">{page}</main>
      </div>
    </div>
  );
}
