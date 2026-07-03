import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppFooter from "@/components/AppFooter";
import AppNavbar from "@/layouts/AppNavbar";
import AppSidebar from "@/layouts/AppSidebar";

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AppNavbar
          onMenuClick={() => setSidebarOpen(true)}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        <main className="flex-1 px-6 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>

        <AppFooter />
      </div>
    </div>
  );
}

export default AppLayout;