import { Outlet, Link, useLocation } from "react-router-dom";
import { Flower2, LayoutDashboard, Warehouse, Sprout, Scissors, Trash2, BarChart3, CalendarClock, Menu, History, RefreshCw, ClipboardList, ClipboardCheck, ListChecks, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import OfflineBanner from "./OfflineBanner";
import PwaInstallPrompt from "./PwaInstallPrompt";
import PwaUpdateBanner from "./PwaUpdateBanner";
import AgroVitaoIA from "./AgroVitaoIA";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/estufas", label: "Estufas", icon: Warehouse },
  { path: "/plantio", label: "Plantio", icon: Sprout },
  { path: "/colheita", label: "Colheita", icon: Scissors },
  { path: "/plano-separacao", label: "Plano de Separação", icon: ListChecks },
  { path: "/colhido-recebido", label: "Colhido × Recebido", icon: ClipboardCheck },
  { path: "/descarte", label: "Descarte", icon: Trash2 },
  { path: "/previsao", label: "Previsão", icon: CalendarClock },
  { path: "/produtividade", label: "Produtividade", icon: BarChart3 },
  { path: "/dados-colheita", label: "Dados de Colheita", icon: FileSpreadsheet },
  { path: "/historico", label: "Histórico", icon: History },
  { path: "/ciclos", label: "Ciclos", icon: RefreshCw },
  { path: "/pautas", label: "Pautas", icon: ClipboardList },
];

// Itens que aparecem na barra inferior do mobile (os mais usados)
const mobileBottomItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/estufas", label: "Estufas", icon: Warehouse },
  { path: "/plantio", label: "Plantio", icon: Sprout },
  { path: "/colheita", label: "Colheita", icon: Scissors },
  { path: "/descarte", label: "Descarte", icon: Trash2 },
];

export default function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — visível apenas em desktop */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground
          flex flex-col transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
          <div className="w-14 h-14 rounded-xl bg-sidebar-primary/20 flex items-center justify-center">
            <img
              src="https://media.base44.com/images/public/69c50a8a395ae9d63dbc77c6/ec016ce01_Designsemnome2.png"
              className="w-12 h-12 object-contain"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Flores da Terra</h1>
            <p className="text-xs text-sidebar-foreground/50">Gestão de Estufas</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
                  ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border">
          <p className="text-[10px] text-sidebar-foreground/30 text-center">FloraBase v86.0</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar text-sidebar-foreground sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <img
              src="https://media.base44.com/images/public/69c50a8a395ae9d63dbc77c6/ec016ce01_Designsemnome2.png"
              className="w-8 h-8 object-contain"
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <span className="font-semibold text-sm">Flores da Terra</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-sidebar-accent"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <OfflineBanner />
        <PwaUpdateBanner />
        <PwaInstallPrompt />
        <AgroVitaoIA />

        {/* Conteúdo principal — com padding-bottom no mobile para não ficar atrás da barra inferior */}
        <main className="flex-1 overflow-y-auto bg-background pb-20 lg:pb-0">
          <Outlet />
        </main>

        {/* Barra de navegação inferior — apenas no mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-sidebar border-t border-sidebar-border flex items-center justify-around px-1 py-2 safe-area-inset-bottom">
          {mobileBottomItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all min-w-[56px] ${
                  isActive
                    ? "text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/50"
                }`}
              >
                <div className={`p-1.5 rounded-lg ${isActive ? "bg-sidebar-primary" : ""}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          {/* Botão "Mais" para abrir o menu completo */}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-sidebar-foreground/50 min-w-[56px]"
          >
            <div className="p-1.5 rounded-lg">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
