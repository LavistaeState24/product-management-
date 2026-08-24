import { useState } from "react";
import {
  Bell,
  ClipboardCheck,
  Factory,
  IndianRupee,
  LogOut,
  Menu,
  PackageMinus,
  PackageX,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import {
  formatUserLastLogin,
  formatUserLastSeen,
} from "@/utils/userActivity";

function AppNavbar({
  onMenuClick,
  onToggleCollapse,
  notifications = [],
  notificationCount,
  onNotificationClick,
}) {
  const { user, signOut } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const activeNotificationCount = Number.isFinite(Number(notificationCount))
    ? Number(notificationCount)
    : notifications.length;

  const handleMenuClick = () => {
    if (window.innerWidth < 768) {
      onMenuClick();
      return;
    }

    onToggleCollapse();
  };

  const handleProfileClick = () => {
    setProfileOpen((prev) => !prev);
    setNotificationsOpen(false);
  };

  const handleNotificationToggle = () => {
    setNotificationsOpen((prev) => !prev);
    setProfileOpen(false);
  };

  const handleNotificationItemClick = (notification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const formatNotificationTime = (date) => {
    if (!date) return "";

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return "";
    }

    return value.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const formatQuantity = (value) =>
    new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const getNotificationVariant = (type) => {
    if (
      type === "Out of Stock" ||
      type === "Supplier Payment Overdue" ||
      type === "Customer Payment Overdue"
    ) {
      return "danger";
    }

    if (
      type === "Low Stock" ||
      type === "Supplier Payment Due Soon" ||
      type === "Customer Payment Due Soon"
    ) {
      return "warning";
    }

    if (type === "Order Ready for Dispatch") {
      return "success";
    }

    return "info";
  };

  const NOTIFICATION_ICONS = {
    "Out of Stock": PackageX,
    "Low Stock": PackageMinus,
    "Supplier Payment Overdue": Wallet,
    "Supplier Payment Due Soon": Wallet,
    "Customer Payment Overdue": IndianRupee,
    "Customer Payment Due Soon": IndianRupee,
    "Order Accepted": ClipboardCheck,
    "Order Progress": Factory,
    "Order Ready for Dispatch": Truck,
  };

  const NOTIFICATION_ICON_STYLES = {
    danger: "bg-danger-tint text-danger",
    warning: "bg-warning-tint text-warning",
    info: "bg-info-tint text-info",
    success: "bg-success-tint text-success",
  };

  const getNotificationIcon = (type) => NOTIFICATION_ICONS[type] || Bell;

  const getNotificationTitle = (notification) => {
    if (notification.title) {
      return notification.title;
    }

    if (notification.supplier) {
      return notification.supplier?.name || "Supplier payment reminder";
    }

    if (notification.customer) {
      return notification.customer?.name || "Customer payment reminder";
    }

    if (notification.orderNo) {
      return `Order ${notification.orderNo}`;
    }

    return notification.itemName || "Stock reminder";
  };

  const getNotificationMessage = (notification) => {
    if (notification.message || notification.description) {
      return notification.message || notification.description;
    }

    if (notification.supplier) {
      const invoice = notification.invoiceNumber
        ? ` for ${notification.invoiceNumber}`
        : "";

      return `${formatCurrency(notification.outstandingAmount)} outstanding${invoice}`;
    }

    if (notification.customer) {
      const invoice = notification.invoiceNumber
        ? ` for ${notification.invoiceNumber}`
        : "";

      return `${formatCurrency(notification.amountReceivable)} receivable${invoice}`;
    }

    const stockType = notification.stockType
      ? ` in ${notification.stockType}`
      : "";

    return `${formatQuantity(notification.quantity)} available${stockType}`;
  };

  const getNotificationMeta = (notification) => {
    const meta = [];

    if (notification.type) {
      meta.push(notification.type);
    }

    if (notification.outstandingAmount != null) {
      meta.push(formatCurrency(notification.outstandingAmount));
    } else if (notification.amountReceivable != null) {
      meta.push(formatCurrency(notification.amountReceivable));
    } else if (notification.quantity != null) {
      meta.push(`${formatQuantity(notification.quantity)} qty`);
    }

    const date = formatNotificationTime(
      notification.dueDate ||
        notification.createdAt ||
        notification.date,
    );

    if (date) {
      meta.push(date);
    }

    return meta;
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-navbar px-6 py-4 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        {/* Menu */}
        <button
          type="button"
          onClick={handleMenuClick}
          className="rounded-full border border-border bg-card p-3 text-heading transition hover:border-primary hover:text-primary"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* ==================================================
              NOTIFICATION
          ================================================== */}
          <div className="relative">
            <button
              type="button"
              onClick={handleNotificationToggle}
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-card transition hover:border-primary"
            >
              <Bell className="h-5 w-5 text-primary" />

              {activeNotificationCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
                  {activeNotificationCount > 99
                    ? "99+"
                    : activeNotificationCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-32px)] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div>
                    <p className="text-base font-bold text-heading">
                      Notifications
                    </p>

                    <p className="mt-0.5 text-xs text-body">
                      {activeNotificationCount > 0
                        ? `${activeNotificationCount} active ${
                            activeNotificationCount === 1
                              ? "reminder"
                              : "reminders"
                          }`
                        : "No active reminders"}
                    </p>
                  </div>

                  {activeNotificationCount > 0 && (
                    <Badge variant="info">
                      {activeNotificationCount > 99
                        ? "99+"
                        : activeNotificationCount}
                    </Badge>
                  )}
                </div>

                {/* Notification List */}
                <div
                  className={`
                    overscroll-contain

                    [scrollbar-width:thin]
                    [&::-webkit-scrollbar]:w-1.5
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    [&::-webkit-scrollbar-thumb]:bg-border
                    ${
                      notifications.length > 5
                        ? "max-h-[250px] overflow-y-auto"
                        : ""
                    }
                  `}
                >
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Bell className="h-5 w-5 text-primary" />
                      </div>

                      <p className="mt-3 text-sm font-semibold text-heading">
                        No notifications
                      </p>

                      <p className="mt-1 text-xs text-body">
                        Your reminders will appear here.
                      </p>
                    </div>
                  ) : (
                    notifications.map((notification, index) => {
                      const notificationId =
                        notification._id ||
                        notification.id ||
                        index;
                      const meta = getNotificationMeta(notification);
                      const variant = getNotificationVariant(notification.type);
                      const NotificationIcon = getNotificationIcon(notification.type);

                      return (
                        <button
                          key={notificationId}
                          type="button"
                          onClick={() =>
                            handleNotificationItemClick(notification)
                          }
                          className={`
                            relative
                            flex
                            w-full
                            gap-3
                            border-b
                            border-border
                            px-5
                            py-4
                            text-left
                            transition
                            last:border-b-0
                            hover:bg-primary/5
                            bg-card
                          `}
                        >
                          {/* Type Icon */}
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                              NOTIFICATION_ICON_STYLES[variant] ||
                              NOTIFICATION_ICON_STYLES.info
                            }`}
                          >
                            <NotificationIcon className="h-4 w-4" />
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p
                                className="truncate text-sm font-bold text-heading"
                              >
                                {getNotificationTitle(notification)}
                              </p>

                              {notification.type && (
                                <Badge
                                  variant={variant}
                                  className="shrink-0"
                                >
                                  {notification.type}
                                </Badge>
                              )}
                            </div>

                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-body">
                              {getNotificationMessage(notification)}
                            </p>

                            {meta.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {meta.map((item) => (
                                  <span
                                    key={item}
                                    className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-body-muted"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 5 && (
                  <div className="border-t border-border px-5 py-3 text-center">
                    <p className="text-xs font-medium text-body">
                      Scroll to view more notifications
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ==================================================
              PROFILE
          ================================================== */}
          <div className="relative">
            <button
              type="button"
              onClick={handleProfileClick}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-card transition hover:border-primary"
            >
              <UserRound className="h-5 w-5 text-primary" />

              <span
                className={`absolute right-0 -top-0 h-3 w-3 rounded-full border-2 border-card ${
                  user?.isOnline
                    ? "bg-emerald-400"
                    : "bg-body-muted"
                }`}
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
                {/* Profile Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10">
                      <UserRound className="h-6 w-6 text-primary" />

                      <span
                        className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ${
                          user?.isOnline
                            ? "bg-emerald-400"
                            : "bg-body-muted"
                        }`}
                      />
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

                  <Badge
                    variant={
                      user?.isOnline
                        ? "success"
                        : "neutral"
                    }
                  >
                    {user?.isOnline ? "Online" : "Away"}
                  </Badge>
                </div>

                {/* Profile Info */}
                <div className="space-y-5 border-b border-border px-6 py-5">
                  <div>
                    <p className="text-md font-semibold text-black">
                      Email
                    </p>

                    <p className="mt-2 text-sm font-medium text-heading">
                      {user?.email}
                    </p>
                  </div>

                  <div>
                    <p className="text-md font-semibold text-black">
                      Last Login
                    </p>

                    <p className="mt-2 text-sm font-medium text-heading">
                      {formatUserLastLogin(user)}
                    </p>
                  </div>

                  <div>
                    <p className="text-md font-semibold text-black">
                      Last Seen
                    </p>

                    <p className="mt-2 text-sm font-medium text-heading">
                      {formatUserLastSeen(user)}
                    </p>
                  </div>
                </div>

                {/* Logout */}
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
      </div>
    </header>
  );
}

export default AppNavbar;
