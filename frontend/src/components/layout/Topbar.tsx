import { LogOut, Menu } from "lucide-react";

import { Button } from "../ui";
import { useAuth } from "../../hooks/AuthProvider";

type TopbarProps = {
  onMenu: () => void;
};

export function Topbar({ onMenu }: TopbarProps) {
  const { logout, user } = useAuth();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onMenu} className="md:hidden" aria-label="Abrir menú">
            <Menu size={18} />
          </Button>
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-gray-200">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-gray-800">Control Asistencia Reinserción</div>
              <div className="text-xs text-gray-500">React · Tailwind · TS</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <span className="chip">Cursos</span>
            <span className="chip">Asistencia</span>
            <span className="chip">Notas</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user ? <span className="text-xs text-gray-500">Hola, {user.name}</span> : null}
          <Button variant="ghost" className="text-brand">
            Soporte
          </Button>
          <Button variant="accent" onClick={() => void logout()}>
            <LogOut size={16} /> Salir
          </Button>
        </div>
      </div>
    </header>
  );
}
