import { X } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { SIDEBAR_ITEMS } from '@/constants/navigation';
import { useCan } from '@/hooks/useCan';
import { cn } from '@/utils/cn';

import logo from '../../src/assets/logo.png';

function AppSidebar({ open, onClose, collapsed }) {
  const can = useCan();

  const visibleItems = SIDEBAR_ITEMS.filter((item) =>
    can(item.permission),
  );

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-overlay transition-opacity duration-300 md:hidden',
          open
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-80 flex-col overflow-hidden bg-sidebar text-card shadow-lg backdrop-blur transition-all duration-300',
          'md:sticky md:top-0 md:h-screen md:translate-x-0',
          collapsed ? 'md:w-16' : 'md:w-64',
          open
            ? 'translate-x-0'
            : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Header / Logo */}
        <div
          className={cn(
            'flex shrink-0 items-center border-b border-card-soft px-6 py-3',
            collapsed
              ? 'md:justify-center md:px-3'
              : 'justify-between',
          )}
        >
          <div
            className={cn(
              'flex items-center',
              collapsed ? 'md:justify-center' : 'gap-3',
            )}
          >
            <img
              src={logo}
              alt="Customized Polycast"
              className={cn(
                'object-contain transition-all duration-300',
                collapsed
                  ? 'h-16 w-16'
                  : 'mx-auto h-24 w-auto',
              )}
            />
          </div>

          {/* Mobile Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-white transition-colors hover:bg-sidebar-hover focus:outline-none focus:ring-0 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            'min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-3',
            '[scrollbar-width:none]',
            '[-ms-overflow-style:none]',
            '[&::-webkit-scrollbar]:hidden',
          )}
        >
          {visibleItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                    collapsed
                      ? 'md:justify-center md:gap-0 md:px-3'
                      : 'gap-3',
                    isActive
                      ? 'bg-success text-white'
                      : 'text-white hover:bg-success hover:text-white',
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />

                {!collapsed && (
                  <span className="truncate">
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="m-3 shrink-0 rounded-xl border border-card-soft bg-sidebar p-4">
            <p className="text-sm font-semibold text-card">
              Operations CRM
            </p>

            <p className="mt-2 text-sm leading-5 text-white">
              Manage purchases, stock, production, sales,
              payments, reports, and users from one place.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

export default AppSidebar;