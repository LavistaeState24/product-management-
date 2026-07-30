import { Menu, PanelLeftClose, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { SIDEBAR_ITEMS } from "@/constants/navigation";
import { cn } from "@/utils/cn";
import logo from "../../assets/custo.png";
import { useCan } from "@/hooks/useCan";

function AppSidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const can = useCan();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-overlay transition md:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-80 flex-col bg-sidebar text-card transition-all duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0",
          collapsed ? "md:w-20" : "md:w-64",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div
          className={cn(
            "flex items-center border-b border-card-soft px-6 py-3",
            collapsed ? "md:justify-center md:px-3" : "justify-between"
          )}
        >
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Customized Polycast"
              className={cn(
                "object-contain transition-all duration-300",
                collapsed ? "h-10 w-10" : "h-12 w-12"
              )}
            />

            {!collapsed && (
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-card-muted">
                  Customized Polycast
                </p>
                <h1 className="mt-1 text-xl font-bold text-card">
                  Operations CRM
                </h1>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Collapse Button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden rounded-lg p-2 text-card transition hover:bg-sidebar-hover md:flex"
            >
              {collapsed ? (
                <Menu className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>

            {/* Mobile Close */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-card transition hover:bg-sidebar-hover md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          {SIDEBAR_ITEMS.filter((item) => can(item.permission)).map(
            (item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition",
                      collapsed ? "md:justify-center md:gap-0" : "gap-3",
                      isActive
                        ? "bg-primary text-card"
                        : "text-card-dim hover:bg-sidebar-hover hover:text-card"
                    )
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            }
          )}
        </nav>

        {!collapsed && (
          <div className="m-4 rounded-3xl border border-card-soft bg-card-soft p-4">
            <p className="text-sm font-semibold text-card">Operations Roadmap</p>
            <p className="mt-2 text-sm text-card-muted">
              Purchases and sales are live. Stock, payments, and reports remain
              scheduled for later phases.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

export default AppSidebar;
