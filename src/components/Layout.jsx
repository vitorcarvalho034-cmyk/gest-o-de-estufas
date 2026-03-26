import { Outlet, Link, useLocation } from "react-router-dom";
import { Flower2, LayoutDashboard, Warehouse, Sprout, Scissors, Trash2, BarChart3, CalendarClock, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/estufas", label: "Estufas", icon: Warehouse },
  { path: "/plantio", label: "Plantio", icon: Sprout },
  { path: "/colheita", label: "Colheita", icon: Scissors },
  { path: "/descarte", label: "Descarte", icon: Trash2 },
  { path: "/previsao", label: "Previsão", icon: CalendarClock },
  { path: "/produtividade", label: "Produtividade", icon: BarChart3 },
];

export default function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground
        flex flex-col transition-transform duration-300 ease-in-out
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary/20 flex items-center justify-center">
            <Flower2 className="w-6 h-6 text-sidebar-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">FloraBase</h1>
            <p className="text-xs text-sidebar-foreground/50">Gestão de Estufas</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  }
                `}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border">
          <p className="text-[10px] text-sidebar-foreground/30 text-center">FloraBase v1.0</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-muted">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Flower2 className="w-5 h-5 text-primary" />
            <span className="font-semibold">FloraBase</span>
          </div>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}