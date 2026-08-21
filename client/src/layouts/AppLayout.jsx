import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import AppFooter from "@/components/AppFooter";
import AppNavbar from "@/layouts/AppNavbar";
import AppSidebar from "@/layouts/AppSidebar";
import PaymentReminderToasts from "@/features/payment-management/components/PaymentReminderToasts";
import { PERMISSIONS } from "@/constants/permissions";
import { fetchDashboard } from "@/features/dashboard/services/dashboardService";
import { useAuth } from "@/hooks/useAuth";

function AppLayout() {
  const { user, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationAlerts, setNotificationAlerts] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const userId = user?.id || user?._id;

    if (!userId || !hasPermission(PERMISSIONS.canViewDashboard)) {
      setNotificationAlerts([]);
      setNotificationCount(0);
      return undefined;
    }

    let ignore = false;

    async function loadNotifications() {
      try {
        const dashboard = await fetchDashboard({ period: "this-month" });

        if (ignore) {
          return;
        }

        const alerts = dashboard.notificationAlerts || [];
        setNotificationAlerts(alerts);
        setNotificationCount(
          Number.isFinite(Number(dashboard.notificationCount))
            ? Number(dashboard.notificationCount)
            : alerts.length,
        );
      } catch (error) {
        if (!ignore) {
          setNotificationAlerts([]);
          setNotificationCount(0);
        }
      }
    }

    loadNotifications();

    return () => {
      ignore = true;
    };
  }, [user?.id, user?._id, hasPermission]);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AppNavbar
          onMenuClick={() => setSidebarOpen(true)}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          notifications={notificationAlerts}
          notificationCount={notificationCount}
        />
        <PaymentReminderToasts />

        <main className="flex-1 px-6 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>

        <AppFooter />
      </div>
    </div>
  );
}

export default AppLayout;
