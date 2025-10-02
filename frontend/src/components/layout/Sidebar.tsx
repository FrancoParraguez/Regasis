import clsx from "clsx";
import { NavLink } from "react-router-dom";

import { useAuth } from "../../hooks/AuthProvider";
import type { LucideIcon } from "lucide-react";

import type { AppRoute, Role } from "../../routes/definitions";

type SidebarProps = {
  open: boolean;
  items: (AppRoute & { label: string; icon: LucideIcon })[];
  onNavigate?: () => void;
};

export function Sidebar({ open, items, onNavigate }: SidebarProps) {
  const { user } = useAuth();
  const role: Role = user?.role ?? "ADMIN";

  return (
    <aside className={clsx("col-span-12 md:col-span-3 lg:col-span-2", open ? "block" : "hidden md:block")}>
      <div className="sticky top-4 space-y-3">
        <nav className="card p-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => clsx("nav-btn w-full", isActive && "active")}
                onClick={onNavigate}
              >
                {Icon ? <Icon size={18} aria-hidden /> : null}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
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
