import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AppFooter from "@/components/AppFooter";
import AppNavbar from "@/layouts/AppNavbar";
import AppSidebar from "@/layouts/AppSidebar";
import PaymentReminderToasts from "@/features/payment-management/components/PaymentReminderToasts";
import { PERMISSIONS } from "@/constants/permissions";
import { fetchDashboard } from "@/features/dashboard/services/dashboardService";
import { markNotificationSeen } from "@/features/orders/services/orderService";
import { useAuth } from "@/hooks/useAuth";
import { storage } from "@/services/storage";

const ALERT_ROUTES = {
  "raw-material": () => "/stock",
  "pu-chemical": () => "/stock",
  rod: () => "/rod-stocks",
  sheet: (alert) =>
    alert.stockId ? `/sheet-stock/${alert.stockId}` : "/sheet-stock",
  "pu-product": (alert) =>
    alert.stockId ? `/pu-product-stock/${alert.stockId}` : "/pu-product-stock",
  "legacy-product": () => "/finished-goods-stock",
  purchase: (alert) =>
    alert.purchaseId ? `/purchases/${alert.purchaseId}` : "/payment-management",
  sale: (alert) =>
    alert.saleId ? `/sales/${alert.saleId}` : "/payment-management",
  order: () => "/orders",
};

function resolveNotificationRoute(alert) {
  const resolver = ALERT_ROUTES[alert.routeKey];
  return resolver ? resolver(alert) : null;
}

function AppLayout() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(
    () => new Set(storage.getDismissedAlertIds()),
  );

  useEffect(() => {
    const userId = user?.id || user?._id;

    if (!userId || !hasPermission(PERMISSIONS.canViewDashboard)) {
      setAlerts([]);
      return undefined;
    }

    let ignore = false;

    async function loadNotifications() {
      try {
        const dashboard = await fetchDashboard({ period: "this-month" });

        if (ignore) {
          return;
        }

        setAlerts(dashboard.notificationFeed || []);
      } catch (error) {
        if (!ignore) {
          setAlerts([]);
        }
      }
    }

    loadNotifications();

    return () => {
      ignore = true;
    };
  }, [user?.id, user?._id, hasPermission]);

  const visibleAlerts = alerts.filter((alert) =>
    alert.routeKey === "order" ? !alert.seen : !dismissedIds.has(alert.id),
  );

  function handleNotificationClick(alert) {
    if (alert.routeKey === "order") {
      if (!alert.seen) {
        setAlerts((prev) =>
          prev.map((item) =>
            item.id === alert.id ? { ...item, seen: true } : item,
          ),
        );
        markNotificationSeen(alert.id).catch(() => {});
      }
    } else {
      storage.addDismissedAlertId(alert.id);
      setDismissedIds((prev) => new Set(prev).add(alert.id));
    }

    const path = resolveNotificationRoute(alert);
    if (path) {
      navigate(path);
    }
  }

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
          notifications={visibleAlerts}
          notificationCount={visibleAlerts.length}
          onNotificationClick={handleNotificationClick}
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
