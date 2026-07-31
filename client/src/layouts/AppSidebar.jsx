import { Menu, PanelLeftClose, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { SIDEBAR_ITEMS } from "@/constants/navigation";
import { cn } from "@/utils/cn";
import logo from "../../assets/logo.png";
import { useCan } from "@/hooks/useCan";

function AppSidebar({ open, onClose, collapsed }) {
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
          "fixed inset-y-0 left-0 z-40 flex w-80 flex-col overflow-hidden bg-sidebar text-card transition-all duration-300 md:sticky md:top-0 md:h-screen shadow-lg backdrop-blur overflow-y-visible md:translate-x-0",
          collapsed ? "md:w-24" : "md:w-64",
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
                collapsed ? "h-16 w-16" : "h-[80px] w-auto mx-auto"
              )}
            />

            {/* {!collapsed && (
            
            )} */}
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Close */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white transition hover:bg-sidebar-hover md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-2">
          {SIDEBAR_ITEMS.filter((item) => can(item.permission)).map(
            (item,index) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={`${item.path}-${item.label}-${index}`}
                  to={item.path}
                  onClick={onClose}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition",
                      collapsed ? "md:justify-center md:gap-0" : "gap-3",
                      isActive
                        ? "bg-success text-white"
                        : "text-white hover:bg-success hover:text-white"
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
          <div className="m-3 rounded-xl border border-card-soft bg-sidebar p-4">
            <p className="text-sm font-semibold text-card">Operations Roadmap</p>
            <p className="mt-2 text-sm text-white">
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
