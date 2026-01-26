import { useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Bell,
  History,
  Home,
  Loader,
  LogOut,
  Menu,
  PlusCircle,
  SquareStack,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../../hooks/useAuth";

const navItems = [
  { to: "/", label: "Home", icon: Home, roles: ["MASTER_ADMIN", "ADMIN"] },
  { to: "/users", label: "Users", icon: Users, roles: ["MASTER_ADMIN", "ADMIN"] },
  { to: "/reports/new", label: "Service Report", icon: SquareStack, roles: ["ADMIN"] },
  { to: "/history", label: "History Report", icon: History, roles: ["MASTER_ADMIN", "ADMIN"] },
  { to: "/teknisi/reports", label: "My Assignments", icon: PlusCircle, roles: ["TEKNISI"] },
];

export default function DashboardShell() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navigation = useMemo(
    () => navItems.filter((item) => !item.roles || item.roles.includes(user?.role ?? "ADMIN")),
    [user]
  );

  return (
    <div className="dashboard-shell flex h-screen bg-slate-50 text-slate-900">
      <aside
        className={clsx(
          "flex flex-col border-r border-slate-200 bg-white/90 backdrop-blur-md transition-all duration-300",
          collapsed ? "w-20" : "w-72"
        )}
      >
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="h-10 w-10 rounded-xl bg-slate-900 text-white grid place-items-center font-semibold">
            SR
          </div>
          {!collapsed && (
            <div>
              <p className="font-semibold tracking-wide">Service Report</p>
              <p className="text-xs text-slate-500">Internal Dashboard</p>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-2 px-3">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  isActive
                    ? "bg-slate-900 text-white shadow-lg"
                    : "text-slate-500 hover:bg-slate-100"
                )
              }
              end={to === "/"}
            >
              <Icon size={18} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 pb-6">
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-200 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
          >
            <LogOut size={16} />
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-4 border-b border-slate-200 bg-white/80 px-8 py-4 backdrop-blur">
          <button
            className="rounded-full border border-slate-200 p-2 hover:border-slate-400"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            <Menu size={18} />
          </button>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">Hello, {user?.name ?? "User"}</span>
            <span className="text-sm text-slate-500">{user?.role ?? "Admin"}</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="relative w-80 max-w-sm">
              <input
                placeholder="Search files..."
                className="w-full rounded-full border border-transparent bg-slate-100 py-2.5 pl-11 pr-4 text-sm text-slate-600 outline-none ring-offset-2 focus:border-slate-200 focus:ring-2 focus:ring-slate-200"
              />
              <svg
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="9" cy="9" r="5" />
                <path d="m14 14 4 4" strokeLinecap="round" />
              </svg>
            </div>
            <button className="rounded-full border border-slate-200 p-2 text-slate-600 hover:text-slate-900">
              <Bell size={18} />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
              {user?.name?.[0] ?? <Loader size={16} className="animate-spin" />}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
