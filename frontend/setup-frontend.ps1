# setup-frontend.ps1
$ErrorActionPreference = "Stop"

function Write-File($Path, $Content) {
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $Content | Set-Content -Path $Path -Encoding UTF8
}

# Estructura de carpetas
$dirs = @(
  "src",
  "src\components\layout",
  "src\pages",
  "src\services",
  "src\styles",
  "src\hooks",
  "src\utils",
  "src\__tests__"
)
$dirs | ForEach-Object { New-Item -ItemType Directory -Force -Path $_ | Out-Null }

# ---- package.json
$pkg = @'
{
  "name": "control-asistencia-reinsercion",
  "private": true,
  "version": "0.0.5",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "axios": "^1.7.7",
    "clsx": "^2.1.1",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.460.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.27.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^8.6.0",
    "@typescript-eslint/parser": "^8.6.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.9.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.11",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.45",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "vitest": "^2.1.3"
  }
}
'@
Write-File "package.json" $pkg

# ---- tsconfig.json
$tscfg = @'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "strict": true,
    "types": ["vitest/globals", "vite/client", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
'@
Write-File "tsconfig.json" $tscfg

# ---- vite.config.ts
$vite = @'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    css: true
  }
});
'@
Write-File "vite.config.ts" $vite

# ---- tailwind.config.ts
$tw = @'
import type { Config } from "tailwindcss";
export default <Partial<Config>>{
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0069B7",
          50: "#e6f1fa",
          100: "#cfe3f5",
          200: "#9ec7eb",
          300: "#6daae1",
          400: "#3c8ed7",
          500: "#0b72cd",
          600: "#00579a",
          700: "#004576",
          800: "#003352",
          900: "#00212e"
        },
        accent: {
          DEFAULT: "#7CC100",
          600: "#64a300",
          700: "#4e8100"
        }
      },
      borderRadius: { xl: "1rem", "2xl": "1.25rem" }
    }
  },
  plugins: []
};
'@
Write-File "tailwind.config.ts" $tw

# ---- postcss.config.js
$pcfg = @'
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
'@
Write-File "postcss.config.js" $pcfg

# ---- index.html
$html = @'
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Control Asistencia Reinserción</title>
  </head>
  <body class="antialiased bg-gray-50">
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
'@
Write-File "index.html" $html

# ---- styles/global.css
$css = @'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root{
  --brand-primary: #0069B7;
  --brand-primary-600: #00579a;
  --brand-accent: #7CC100;
  --brand-accent-600: #64a300;
}
@layer components{
  .btn{ @apply inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition; }
  .btn-primary{ @apply bg-brand text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand/40; }
  .btn-accent{ @apply bg-accent text-white hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent/30; }
  .btn-ghost{ @apply text-gray-700 hover:bg-gray-100; }
  .card{ @apply rounded-2xl border border-gray-200 bg-white shadow-sm; }
  .chip{ @apply inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600; }
  .input{ @apply w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30; }
  .label{ @apply mb-1 block text-sm font-medium text-gray-700; }
  .nav-btn{ @apply flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100; }
  .active{ @apply bg-blue-50 text-brand; }
  .dot{ @apply inline-block h-2 w-2 rounded-full bg-accent; }
}
'@
Write-File "src\styles\global.css" $css

# ---- src/index.tsx
$indexTsx = @'
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/global.css";
import { AuthProvider } from "./hooks/AuthProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
'@
Write-File "src\index.tsx" $indexTsx

# ---- src/App.tsx
$appTsx = @'
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

  if(!user) return <Login/>;

  const role = (user?.role || "ADMIN") as "ADMIN"|"INSTRUCTOR"|"REPORTER";

  useEffect(() => {
    if(!canAccess(route, role)){
      const fallback = role === "ADMIN" ? "/cursos" : role === "INSTRUCTOR" ? "/asistencia" : "/reportes";
      setRoute(fallback);
    }
  }, [route, role]);

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
'@
Write-File "src\App.tsx" $appTsx

# ---- UI base
$ui = @'
import React from "react";
import clsx from "clsx";

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props}) => (
  <div className={clsx("card", className)} {...props} />
);
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?:"primary"|"ghost"|"accent"}> = ({variant="primary", className, ...props}) => (
  <button className={clsx("btn", variant==="primary" && "btn-primary", variant==="ghost" && "btn-ghost", variant==="accent" && "btn-accent", className)} {...props} />
);
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...p}) => <input className={clsx("input", className)} {...p}/>;
export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className, ...p}) => <label className={clsx("label", className)} {...p}/>;

export function Table({columns, rows}:{columns:string[]; rows:(string|JSX.Element)[][]}){
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c,i)=> <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">{c}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((r,ri)=> (
              <tr key={ri} className="hover:bg-gray-50/60">
                {r.map((cell,ci)=> <td key={ci} className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
'@
Write-File "src\components\ui.tsx" $ui

# ---- Layout: Topbar
$topbar = @'
import React from "react";
import { LogOut, Menu } from "lucide-react";
import { Button } from "../ui";
import { useAuth } from "../../hooks/AuthProvider";

export function Topbar({onMenu}:{onMenu:()=>void}){
  const { logout, user } = useAuth();
  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onMenu} className="md:hidden" aria-label="Abrir menú"><Menu size={18}/></Button>
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-gray-200">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-gray-800">Control Asistencia Reinserción</div>
              <div className="text-xs text-gray-500">React • Tailwind • TS</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="chip">Cursos</span>
            <span className="chip">Asistencia</span>
            <span className="chip">Notas</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && <span className="text-xs text-gray-500">Hola, {user.name}</span>}
          <Button variant="ghost" className="text-brand">Soporte</Button>
          <Button variant="accent" onClick={()=>logout()}><LogOut size={16}/> Salir</Button>
        </div>
      </div>
    </header>
  );
}
'@
Write-File "src\components\layout\Topbar.tsx" $topbar

# ---- Layout: Sidebar
$sidebar = @'
import React from "react";
import { BookOpen, Upload, Shield, CalendarDays, CheckSquare, FileSpreadsheet, BarChart3, CircleUser } from "lucide-react";
import { useAuth } from "../../hooks/AuthProvider";

export type NavItem = { to:string; label:string; icon: JSX.Element };

export function Sidebar({route, setRoute, open}:{ route:string; setRoute:(r:string)=>void; open:boolean}){
  const { user } = useAuth();
  const role = user?.role || "ADMIN";

  const nav: NavItem[] = [];
  if(role === "ADMIN") nav.push(
    {to:"/cursos", label:"Cursos", icon:<BookOpen size={18}/>},
    {to:"/importaciones", label:"Importaciones", icon:<Upload size={18}/>},
    {to:"/auditoria", label:"Auditoría", icon:<Shield size={18}/>} ,
  );
  if(role === "INSTRUCTOR" || role === "ADMIN") nav.push(
    {to:"/sesiones", label:"Sesiones", icon:<CalendarDays size={18}/>},
    {to:"/asistencia", label:"Asistencia", icon:<CheckSquare size={18}/>},
    {to:"/notas", label:"Notas", icon:<FileSpreadsheet size={18}/>} ,
  );
  if(role === "REPORTER" || role === "ADMIN") nav.push(
    {to:"/reportes", label:"Reportes", icon:<BarChart3 size={18}/>} ,
  );
  nav.push({to:"/perfil", label:"Mi Perfil", icon:<CircleUser size={18}/>});

  return (
    <aside className={`col-span-12 md:col-span-3 lg:col-span-2 ${open?"block":"hidden md:block"}`}>
      <div className="sticky top-4 space-y-3">
        <nav className="card p-2">
          {nav.map(item => (
            <button key={item.to} onClick={()=>setRoute(item.to)} className={`nav-btn w-full ${route===item.to?"active":""}`}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="card p-4 text-sm text-gray-600">
          <div>Rol: <span className="font-semibold">{role}</span></div>
          <div>Zona horaria: <span className="font-semibold">America/Santiago</span></div>
        </div>
      </div>
    </aside>
  );
}
'@
Write-File "src\components\layout\Sidebar.tsx" $sidebar

# ---- Páginas (varias)
$adminCursos = @'
import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Table } from "../components/ui";
import { Settings } from "lucide-react";
import { listarCursos } from "../services/cursos";

export default function AdminCursos(){
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const apiCursos = await listarCursos();
        const mapped = apiCursos.map(c => ({
          id: c.id, codigo: c.code, nombre: c.name,
          proveedor: "—",
          fechas: new Date(c.startDate).toLocaleDateString() + " – " + new Date(c.endDate).toLocaleDateString(),
          instructores: []
        }));
        setItems(mapped);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cursos = useMemo(()=> items.filter((c:any)=> (c.codigo+c.nombre+c.proveedor).toLowerCase().includes(q.toLowerCase())), [q, items]);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Cursos</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Buscar cursos…" value={q} onChange={e=>setQ(e.target.value)} />
          <Button>Nuevo curso</Button>
          <Button variant="ghost"><Settings size={16}/> Configuración</Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-8 lg:col-span-9 space-y-4">
          {loading && <Card className="p-4 text-sm text-gray-600">Cargando…</Card>}
          <Table columns={["Código","Nombre","Proveedor","Fechas","Instructores","Acciones"]}
                 rows={cursos.map((c:any)=> [
                   <span className="font-medium" key={c.id}>{c.codigo}</span>,
                   c.nombre,
                   c.proveedor,
                   c.fechas,
                   <span key={c.id+"i"} className="text-gray-600">{c.instructores.join(", ")}</span>,
                   <div key={c.id+"a"} className="flex gap-2">
                     <Button variant="ghost">Editar</Button>
                     <Button variant="ghost" className="text-red-600">Eliminar</Button>
                   </div>
                 ])}
          />
        </div>
        <div className="col-span-12 md:col-span-4 lg:col-span-3 space-y-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500">Cursos activos</div>
            <div className="mt-1 text-2xl font-bold">{items.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Instructores</div>
            <div className="mt-1 text-2xl font-bold">3</div>
            <div className="mt-2 text-xs text-gray-500">Promedio 1.5 por curso</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-semibold">Validaciones clave</div>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li><span className="dot"/> Código de curso único</li>
              <li><span className="dot"/> Soft delete recomendado</li>
              <li><span className="dot"/> Confirmar si tiene clases</li>
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
}
'@
Write-File "src\pages\AdminCursos.tsx" $adminCursos

$adminImport = @'
import React from "react";
import { Button, Card } from "../components/ui";
import { Upload, FileDown } from "lucide-react";

export default function AdminImportaciones(){
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Importaciones</h1>
        <div className="flex items-center gap-2">
          <Button><Upload size={16}/> Importar CSV participantes</Button>
          <Button variant="accent"><FileDown size={16}/> Plantilla CSV</Button>
        </div>
      </header>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <Card className="p-4">
            <p className="label">Subir archivo</p>
            <input type="file" className="input" accept=".csv" />
            <p className="mt-2 text-xs text-gray-500">Formato: <code className="font-mono">email,nombre,apellido,documento,proveedor,codigo_curso,rol_en_curso</code></p>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-semibold">Resumen de resultados</p>
            <ul className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600 md:grid-cols-4">
              <li className="chip">Creados: 12</li>
              <li className="chip">Actualizados: 3</li>
              <li className="chip">Errores: 1</li>
              <li className="chip">Tiempo: 1.2s</li>
            </ul>
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card className="p-4">
            <div className="text-sm font-semibold">Seguridad</div>
            <p className="mt-1 text-sm text-gray-600">JWT/OAuth2, HTTPS, contraseñas robustas.</p>
          </Card>
        </div>
      </div>
    </section>
  );
}
'@
Write-File "src\pages\AdminImportaciones.tsx" $adminImport

$adminAudit = @'
import React from "react";
import { Button, Table } from "../components/ui";

export default function AdminAuditoria(){
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Auditoría</h1>
        <Button variant="ghost">Exportar CSV</Button>
      </header>
      <Table columns={["Fecha","Usuario","Acción","Entidad","Resultado","IP"]}
             rows={[
              ["2025-09-30 10:10","admin@org","POST","/cursos","201","190.54.12.10"],
              ["2025-09-30 10:12","instructor@org","PATCH","/asistencias/123","200","190.54.12.10"]
             ]}
      />
      <div className="card flex items-center gap-3 p-4 text-sm text-gray-600">
        Auditoría inmutable. Acceso solo Admin.
      </div>
    </section>
  );
}
'@
Write-File "src\pages\AdminAuditoria.tsx" $adminAudit

$instSes = @'
import React from "react";
import { Button, Table } from "../components/ui";

export default function InstructorSesiones(){
  const rows = [
    ["2025-10-03","CUR-001","Seguridad en Obra", <Button key="s1" variant="ghost">Abrir</Button>],
    ["2025-10-10","CUR-001","Seguridad en Obra", <Button key="s2" variant="ghost">Abrir</Button>]
  ];
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sesiones</h1>
        <Button>Nueva sesión</Button>
      </header>
      <Table columns={["Fecha","Código","Curso","Acciones"]} rows={rows} />
    </section>
  );
}
'@
Write-File "src\pages\InstructorSesiones.tsx" $instSes

$instAsis = @'
import React, { useEffect, useState } from "react";
import { Button, Input, Table } from "../components/ui";
import { listarSesionesMias } from "../services/sesiones";
import { obtenerAsistencia, guardarAsistencia, AttendanceState } from "../services/asistencias";

export default function InstructorAsistencia(){
  const [sessionId, setSessionId] = useState<string>("");
  const [sesiones, setSesiones] = useState<{id:string; label:string}[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ (async()=>{
    const s = await listarSesionesMias();
    const mapped = s.map(x => ({ id: x.id, label: `${x.course?.code || ''} • ${x.date.slice(0,10)}` }));
    setSesiones(mapped);
    if(mapped[0]) setSessionId(mapped[0].id);
  })(); }, []);

  useEffect(()=>{ (async()=>{
    if(!sessionId) return; setLoading(true);
    try{ const a = await obtenerAsistencia(sessionId); setData(a); }
    finally{ setLoading(false); }
  })(); }, [sessionId]);

  function toggle(enrollmentId: string){
    setData(prev => prev.map(x => x.enrollment.id === enrollmentId ? { ...x, state: x.state === "PRESENTE" ? "AUSENTE" : "PRESENTE" } : x));
  }

  async function save(){
    const items = data.map(x => ({ enrollmentId: x.enrollment.id, state: x.state as AttendanceState, observation: x.observation || undefined }));
    await guardarAsistencia(sessionId, items);
  }

  const columns = ["Participante","Curso","Estado","Obs."];
  const rows = data.map(x => [
    <div key={x.id} className="flex items-center gap-2"><span className="dot"/><span className="font-medium">{x.enrollment.participant.name}</span></div>,
    x.enrollment.course.code,
    <Button key={x.enrollment.id+"btn"} onClick={()=>toggle(x.enrollment.id)} variant={x.state === 'PRESENTE'?"accent":"ghost"}>{x.state}</Button>,
    <Input key={x.enrollment.id+"obs"} defaultValue={x.observation || ''} onChange={(e)=> setData(prev => prev.map(y => y.enrollment.id===x.enrollment.id? { ...y, observation: e.target.value } : y)) }/>
  ]);

  return (
    <section className="space-y-4">
      <header className="flex flex_wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Asistencia</h1>
        <div className="flex items-center gap-2">
          <select className="input" value={sessionId} onChange={e=>setSessionId(e.target.value)}>
            {sesiones.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <Button onClick={save} disabled={!data.length || loading}>{loading? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </header>
      <Table columns={columns} rows={rows} />
    </section>
  );
}
'@
Write-File "src\pages\InstructorAsistencia.tsx" $instAsis

$instNotas = @'
import React, { useEffect, useState } from "react";
import { Button, Table } from "../components/ui";
import { listarMisCursos } from "../services/cursos";
import { listarNotasPorCurso, crearNota, GradeType } from "../services/notas";

export default function InstructorNotas(){
  const [cursoId, setCursoId] = useState<string>("");
  const [cursos, setCursos] = useState<{ id:string; code:string; name:string }[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ (async()=>{
    const cs = await listarMisCursos();
    const mapped = cs.map(c => ({ id: c.id, code: c.code, name: c.name }));
    setCursos(mapped);
    if(mapped[0]) setCursoId(mapped[0].id);
  })(); }, []);

  useEffect(()=>{ (async()=>{
    if(!cursoId) return; setLoading(true);
    try{
      const data = await listarNotasPorCurso(cursoId);
      setRows(data.map(d => ({ id: d.id, Participante: d.enrollment?.participant?.name || "", Tipo: d.type, Nota: d.score.toFixed(1), Fecha: d.date.slice(0,10) })));
    }finally{ setLoading(false); }
  })(); }, [cursoId]);

  async function agregar(){
    const enrollmentId = prompt("ID de inscripción (enrollmentId):")?.trim();
    const type = (prompt("Tipo (P1,P2,EXAMEN,PRACTICA,OTRO):") || "P1").toUpperCase() as GradeType;
    const score = Number(prompt("Nota (1.0 a 7.0):") || "6.0");
    if(!enrollmentId || isNaN(score)) return;
    await crearNota({ enrollmentId, type, score });
    const data = await listarNotasPorCurso(cursoId);
    setRows(data.map(d => ({ id: d.id, Participante: d.enrollment?.participant?.name || "", Tipo: d.type, Nota: d.score.toFixed(1), Fecha: d.date.slice(0,10) })));
  }

  const columns = ["Participante","Tipo","Nota","Fecha"];
  const tableRows = rows.map(r => [r.Participante, r.Tipo, r.Nota, r.Fecha]);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify_between gap-2">
        <h1 className="text-xl font-semibold">Notas</h1>
        <div className="flex items-center gap-2">
          <select className="input" value={cursoId} onChange={e=>setCursoId(e.target.value)}>
            {cursos.map(c => <option key={c.id} value={c.id}>{c.code} • {c.name}</option>)}
          </select>
          <Button onClick={agregar} disabled={!cursoId || loading}>{loading? '...' : 'Agregar nota'}</Button>
        </div>
      </header>
      <Table columns={columns} rows={tableRows} />
      <div className="text-xs text-gray-500">Rango permitido en backend: 1.0 a 7.0 • Tipos válidos: P1, P2, EXAMEN, PRACTICA, OTRO.</div>
    </section>
  );
}
'@
Write-File "src\pages\InstructorNotas.tsx" $instNotas

$report = @'
import React, { useState } from "react";
import { Button, Card, Input, Table } from "../components/ui";
import { reporteAsistencia, reporteCalificaciones } from "../services/reportes";
import { exportToXlsx } from "../utils/xlsx";

export default function Reporteria(){
  const [tipo, setTipo] = useState<'asistencia'|'calificaciones'|'mixto'>('asistencia');
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function consultar(){
    setLoading(true);
    try{
      if(tipo === 'asistencia'){
        const data = await reporteAsistencia({ from: desde || undefined, to: hasta || undefined });
        setRows(data.map((d:any) => ({
          Curso: d.session?.course?.code || "",
          Fecha: d.session?.date?.slice(0,10),
          Participante: d.enrollment?.participant?.name,
          Estado: d.state,
          Obs: d.observation || ""
        })));
      }else if(tipo === 'calificaciones'){
        const data = await reporteCalificaciones({ from: desde || undefined, to: hasta || undefined });
        setRows(data.map((d:any) => ({
          Curso: d.enrollment?.course?.code || "",
          Participante: d.enrollment?.participant?.name,
          Tipo: d.type,
          Nota: d.score,
          Fecha: d.date?.slice(0,10)
        })));
      }else{
        const A = await reporteAsistencia({ from: desde || undefined, to: hasta || undefined });
        const G = await reporteCalificaciones({ from: desde || undefined, to: hasta || undefined });
        setRows([
          ...A.map((d:any)=>({ Tipo: "Asistencia", Curso: d.session?.course?.code, Fecha: d.session?.date?.slice(0,10), Participante: d.enrollment?.participant?.name, Estado: d.state })),
          ...G.map((d:any)=>({ Tipo: "Calificación", Curso: d.enrollment?.course?.code, Fecha: d.date?.slice(0,10), Participante: d.enrollment?.participant?.name, Nota: d.score }))
        ]);
      }
    } finally { setLoading(false); }
  }

  function exportar(){
    exportToXlsx(`reporte-${tipo}-${new Date().toISOString().slice(0,10)}.xlsx`, rows);
  }

  const columns = rows.length ? Object.keys(rows[0]) : ["Curso","Fecha","Participante","Estado/%"];
  const tableRows = rows.length
    ? rows.map(r => columns.map(c => String(r[c] ?? "")))
    : [["CUR-001","2025-10-03","Ana Soto","P (100%)"],["CUR-001","2025-10-10","Leandro Ruiz","A (0%)"]];

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Reportes</h1>
        <div className="flex items-center gap-2">
          <Button onClick={consultar}>{loading? 'Cargando…' : 'Consultar'}</Button>
          <Button onClick={exportar} disabled={!rows.length}>Generar Excel</Button>
        </div>
      </header>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label className="label">Proveedor</label>
                <Input placeholder="(se usa provider del usuario si es REPORTER)" readOnly />
              </div>
              <div>
                <label className="label">Desde</label>
                <Input type="date" value={desde} onChange={e=>setDesde(e.target.value)} />
              </div>
              <div>
                <label className="label">Hasta</label>
                <Input type="date" value={hasta} onChange={e=>setHasta(e.target.value)} />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={tipo} onChange={e=>setTipo(e.target.value as any)}>
                  <option value="asistencia">Asistencia</option>
                  <option value="calificaciones">Calificaciones</option>
                  <option value="mixto">Mixto</option>
                </select>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-semibold">Vista previa</p>
            <Table columns={columns} rows={tableRows} />
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card className="p-4">
            <div className="text-sm font-semibold">Alcance</div>
            <p className="mt-1 text-sm text-gray-600">Los usuarios con rol REPORTER sólo consultan su proveedor asignado (en backend).</p>
          </Card>
        </div>
      </div>
    </section>
  );
}
'@
Write-File "src\pages\Reporteria.tsx" $report

$perfil = @'
import React from "react";
import { Card, Input, Label } from "../components/ui";
import { useAuth } from "../hooks/AuthProvider";

export default function Perfil(){
  const { user } = useAuth();
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Mi Perfil</h1>
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label>Nombre</Label>
            <Input defaultValue={user?.name || "Usuario"}/>
          </div>
          <div>
            <Label>Correo</Label>
            <Input defaultValue={user?.email || ""}/>
          </div>
          <div>
            <Label>Rol</Label>
            <Input defaultValue={user?.role || ""} readOnly/>
          </div>
          <div>
            <Label>Proveedor</Label>
            <Input defaultValue={user?.providerId || ""} readOnly/>
          </div>
        </div>
      </Card>
    </section>
  );
}
'@
Write-File "src\pages\Perfil.tsx" $perfil

$login = @'
import React, { useState } from "react";
import { Button, Card, Input, Label } from "../components/ui";
import { useAuth } from "../hooks/AuthProvider";

export default function Login(){
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@org");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent){
    e.preventDefault();
    setError(null); setLoading(true);
    try{ await login(email, password); }
    catch(err:any){ setError(err?.response?.data?.error || err.message); }
    finally{ setLoading(false); }
  }

  return (
    <div className="mx-auto mt-24 max-w-sm">
      <Card className="p-5">
        <h1 className="mb-3 text-lg font-semibold">Ingresar</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label>Correo</Label>
            <Input value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button disabled={loading}>{loading? "Ingresando…" : "Entrar"}</Button>
        </form>
      </Card>
    </div>
  );
}
'@
Write-File "src\pages\Login.tsx" $login

# ---- Hook AuthProvider
$authHook = @'
import React, { createContext, useContext, useMemo, useState } from "react";
import type { User } from "../services/auth";
import { getCurrentUser, login as apiLogin, logout as apiLogout } from "../services/auth";

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({ user: null, login: async () => { throw new Error("not ready"); }, logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }){
  const [user, setUser] = useState<User | null>(() => getCurrentUser());

  const value = useMemo<AuthCtx>(() => ({
    user,
    async login(email, password){
      const u = await apiLogin({ email, password });
      setUser(u);
      return u;
    },
    logout(){ apiLogout(); setUser(null); }
  }), [user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAuth(){ return useContext(Ctx); }
'@
Write-File "src\hooks\AuthProvider.tsx" $authHook

# ---- Servicios HTTP y API
$http = @'
import axios from "axios";
import { refresh } from "./auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: false,
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing = false as boolean;
let queue: { resolve: (v?: any)=>void; reject: (e: any)=>void }[] = [];

api.interceptors.response.use((r) => r, async (err) => {
  const original: any = err.config || {};
  if(err.response?.status === 401 && !original._retry){
    original._retry = true;
    try{
      if(!refreshing){
        refreshing = true;
        await refresh();
        refreshing = false;
        queue.forEach(p => p.resolve(true));
        queue = [];
      }else{
        await new Promise((resolve, reject) => queue.push({ resolve, reject }));
      }
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;
      return api(original);
    }catch(e){
      queue.forEach(p => p.reject(e));
      queue = [];
      refreshing = false;
      return Promise.reject(e);
    }
  }
  return Promise.reject(err);
});

export default api;
'@
Write-File "src\services\http.ts" $http

$authSvc = @'
import api from "./http";

export type LoginInput = { email: string; password: string };
export type User = { id: string; name: string; email: string; role: "ADMIN"|"INSTRUCTOR"|"REPORTER"; providerId?: string|null };

export function getRefresh(){ return localStorage.getItem("refreshToken"); }
export function setRefresh(rt: string){ localStorage.setItem("refreshToken", rt); }
export function clearRefresh(){ localStorage.removeItem("refreshToken"); }

export async function login(data: LoginInput){
  const res = await api.post("/auth/login", data);
  const { token, user, refreshToken } = res.data as { token: string; user: User; refreshToken: string };
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  setRefresh(refreshToken);
  return user;
}

export async function refresh(){
  const rt = getRefresh();
  if(!rt) throw new Error("No refresh token");
  const { data } = await api.post("/auth/refresh", { refreshToken: rt });
  const { token, refreshToken } = data as { token: string; refreshToken: string };
  localStorage.setItem("token", token);
  setRefresh(refreshToken);
  return token;
}

export async function logout(){
  const rt = getRefresh();
  try{ await api.post("/auth/logout", { refreshToken: rt }); }catch{}
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  clearRefresh();
}

export function getCurrentUser(){
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) as User : null;
}
'@
Write-File "src\services\auth.ts" $authSvc

$cursosSvc = @'
import api from "./http";
export type CursoDTO = { id: string; code: string; name: string; startDate: string; endDate: string; providerId: string; };
export async function listarCursos(){ const { data } = await api.get<CursoDTO[]>("/cursos"); return data; }
export async function listarMisCursos(){ const { data } = await api.get<CursoDTO[]>("/cursos/mios"); return data; }
'@
Write-File "src\services\cursos.ts" $cursosSvc

$sesionesSvc = @'
import api from "./http";
export type SesionDTO = { id: string; courseId: string; date: string; course?: { id: string; code: string; name: string } };
export async function listarSesionesMias(){ const { data } = await api.get<SesionDTO[]>("/sesiones/mias"); return data; }
export async function crearSesion(courseId: string, date: string){ const { data } = await api.post<SesionDTO>("/sesiones", { courseId, date }); return data; }
'@
Write-File "src\services\sesiones.ts" $sesionesSvc

$asistSvc = @'
import api from "./http";
export type AttendanceState = "PRESENTE" | "AUSENTE" | "JUSTIFICADO";
export type AttendanceItemDTO = {
  id: string; state: AttendanceState; observation?: string | null;
  enrollment: { id: string; participant: { id: string; name: string; email?: string|null }; course: { id: string; code: string; name: string } };
};
export async function obtenerAsistencia(sessionId: string){ const { data } = await api.get<AttendanceItemDTO[]>(`/asistencias/session/${sessionId}`); return data; }
export async function guardarAsistencia(sessionId: string, items: { enrollmentId: string; state: AttendanceState; observation?: string }[]){ const { data } = await api.post(`/asistencias/session/${sessionId}`, { items }); return data as { updated: number }; }
'@
Write-File "src\services\asistencias.ts" $asistSvc

$notasSvc = @'
import api from "./http";
export type GradeType = "P1"|"P2"|"EXAMEN"|"PRACTICA"|"OTRO";
export type GradeDTO = { id: string; enrollmentId: string; type: GradeType; score: number; date: string; enrollment?: { participant: { name: string; email?: string|null } } };
export async function listarNotasPorCurso(courseId: string){ const { data } = await api.get<GradeDTO[]>(`/notas/course/${courseId}`); return data; }
export async function crearNota(input: { enrollmentId: string; type: GradeType; score: number; date?: string }){ const { data } = await api.post<GradeDTO>("/notas", input); return data; }
'@
Write-File "src\services\notas.ts" $notasSvc

$repSvc = @'
import api from "./http";
export async function reporteAsistencia(params: { from?: string; to?: string; providerId?: string }){ const { data } = await api.get("/reportes/asistencia", { params }); return data as any[]; }
export async function reporteCalificaciones(params: { from?: string; to?: string; providerId?: string }){ const { data } = await api.get("/reportes/calificaciones", { params }); return data as any[]; }
'@
Write-File "src\services\reportes.ts" $repSvc

$xlsxUtil = @'
import * as XLSX from "xlsx";
export function exportToXlsx(filename: string, rows: Record<string, any>[], sheetName = "Reporte"){
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
'@
Write-File "src\utils\xlsx.ts" $xlsxUtil

# ---- setupTests.ts (mínimo)
$tests = @'
import "@testing-library/jest-dom";
localStorage.setItem("user", JSON.stringify({ id: "u1", name: "Tester", email: "t@t", role: "ADMIN" }));
localStorage.setItem("token", "dummy-token");
'@
Write-File "src\setupTests.ts" $tests

Write-Host "✅ Frontend generado."
Write-Host "Recuerda crear .env con: VITE_API_BASE_URL=http://localhost:4000/api"
