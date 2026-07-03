import { useState } from "react";
import { LogOut, Menu, UserRound } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

function AppNavbar({ onMenuClick, onToggleCollapse }) {
  const { user, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleMenuClick = () => {
    if (window.innerWidth < 768) {
      onMenuClick();
      return;
    }

    onToggleCollapse();
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-navbar px-6 py-4 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleMenuClick}
          className="rounded-full border border-border bg-card p-3 text-heading transition hover:border-primary hover:text-primary"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-border bg-card transition hover:border-primary"
          >
            <UserRound className="h-6 w-6 text-primary" />
            <span className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-card bg-emerald-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-4 w-80 overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <UserRound className="h-6 w-6 text-primary" />
                    <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400" />
                  </div>

                  <div>
                    <p className="text-base font-bold text-heading">
                      {user?.name}
                    </p>
                    <p className="text-xs uppercase tracking-[0.3em] text-body">
                      {user?.role}
                    </p>
                  </div>
                </div>

                <Badge variant="success">Online</Badge>
              </div>

              <div className="space-y-5 border-b border-border px-6 py-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-body">
                    Email
                  </p>
                  <p className="mt-2 text-sm font-medium text-heading">
                    {user?.email}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-body">
                    Last Login
                  </p>
                  <p className="mt-2 text-sm font-medium text-heading">
                    {user?.lastLogin || "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-body">
                    Last Seen
                  </p>
                  <p className="mt-2 text-sm font-medium text-heading">
                    Online
                  </p>
                </div>
              </div>

              <div className="px-4 py-4">
                <Button
                  onClick={signOut}
                  variant="ghost"
                  className="w-full justify-start gap-3 rounded-2xl text-red-500 hover:bg-red-500/10 hover:text-red-500"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default AppNavbar;