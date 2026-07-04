import { X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { SIDEBAR_ITEMS } from "@/constants/navigation";
import { cn } from "@/utils/cn";
import { useAuth } from "@/hooks/useAuth";

function AppSidebar({ open, onClose, collapsed, }) {
  const { hasPermission } = useAuth();

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
          collapsed ? "md:w-12" : "md:w-64",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div
          className={cn(
            "flex items-center border-b border-card-soft px-6 py-3",
            collapsed ? "md:justify-center md:px-3" : "justify-between"
          )}
        >
          {collapsed ? (
            <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-card md:flex">
              CRM
            </div>
          ) : (
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-card-muted">
                Operations
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-card">
                CRM Suite
              </h1>
            </div>
          )}

          <button
            className="rounded-full p-2 text-card transition hover:bg-sidebar-hover md:hidden"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          {SIDEBAR_ITEMS.filter((item) => hasPermission(item.permission)).map(
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
              Purchases are live. Sales, stock, payments, and reports remain
              scheduled for later phases.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

export default AppSidebar;
