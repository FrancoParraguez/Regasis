import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useMemo, useState, type ReactElement } from "react";

import { Topbar } from "./components/layout/Topbar";
import { Sidebar } from "./components/layout/Sidebar";
import Login from "./pages/Login";
import { useAuth } from "./hooks/AuthProvider";
import { APP_ROUTES, DEFAULT_ROUTE, type AppRoute, type Role } from "./routes/definitions";
import type { LucideIcon } from "lucide-react";

function RequireRole({ roles, children }: { roles: Role[]; children: ReactElement }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={DEFAULT_ROUTE[user.role]} replace />;
  }
  return children;
}

function AppLayout() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const role: Role = user?.role ?? "ADMIN";
  const navItems = useMemo(
    () =>
      APP_ROUTES.filter(
        (route): route is AppRoute & { label: string; icon: LucideIcon } =>
          Boolean(route.label && route.icon) && route.roles.includes(role),
      ),
    [role],
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Topbar onMenu={() => setMenuOpen((value) => !value)} />
      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-4 p-4">
        <Sidebar open={menuOpen} items={navItems} onNavigate={() => setMenuOpen(false)} />
        <main className="col-span-12 md:col-span-9 lg:col-span-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={DEFAULT_ROUTE[user.role]} replace /> : <Login />}
      />
      <Route element={<AppLayout />}>
        {APP_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<RequireRole roles={route.roles}>{route.element}</RequireRole>}
          />
        ))}
        <Route
          index
          element={<Navigate to={DEFAULT_ROUTE[(user?.role ?? "ADMIN") as Role]} replace />}
        />
      </Route>
      <Route
        path="*"
        element={<Navigate to={user ? DEFAULT_ROUTE[user.role] : "/login"} replace />}
      />
    </Routes>
  );
}
