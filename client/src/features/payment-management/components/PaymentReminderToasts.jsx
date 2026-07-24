import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PERMISSIONS } from '@/constants/permissions';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/features/sales/utils/saleHelpers';
import { fetchPaymentReminders } from '@/features/payment-management/services/paymentManagementService';

const SESSION_KEY_PREFIX = 'crm_payment_reminder_toast';

function getReminderVariant(reminderType) {
  if (reminderType === 'Overdue') {
    return 'error';
  }

  if (reminderType === 'Due Today') {
    return 'warning';
  }

  return 'info';
}

function getReminderTitle(scope, reminderType) {
  if (reminderType === 'Overdue') {
    return `${scope} Payment Overdue`;
  }

  if (reminderType === 'Due Today') {
    return `${scope} Payment Due Today`;
  }

  return `${scope} Payment Upcoming`;
}

function getReminderKey(scope, reminder) {
  const id = reminder.purchaseId || reminder.saleId || reminder.id || reminder.invoiceNumber;
  const dueDate = reminder.dueDate ? new Date(reminder.dueDate).toISOString().slice(0, 10) : '';

  return `${SESSION_KEY_PREFIX}:${scope}:${id}:${reminder.reminderType}:${dueDate}`;
}

function wasReminderShown(key) {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch (error) {
    return false;
  }
}

function markReminderShown(key) {
  try {
    sessionStorage.setItem(key, '1');
  } catch (error) {
    // Ignore storage failures; the toast should still be shown.
  }
}

function showSupplierReminder(toast, reminder) {
  const key = getReminderKey('Supplier', reminder);

  if (wasReminderShown(key)) {
    return;
  }

  toast.showToast({
    title: getReminderTitle('Supplier', reminder.reminderType),
    description: `${reminder.supplierName || reminder.supplier?.name || 'Supplier'} - ${formatCurrency(
      reminder.outstandingAmount,
    )} outstanding`,
    variant: getReminderVariant(reminder.reminderType),
    duration: 6000,
  });
  markReminderShown(key);
}

function showCustomerReminder(toast, reminder) {
  const key = getReminderKey('Customer', reminder);

  if (wasReminderShown(key)) {
    return;
  }

  toast.showToast({
    title: getReminderTitle('Customer', reminder.reminderType),
    description: `${reminder.customerName || reminder.customer?.name || 'Customer'} - ${formatCurrency(
      reminder.amountReceivable,
    )} receivable`,
    variant: getReminderVariant(reminder.reminderType),
    duration: 6000,
  });
  markReminderShown(key);
}

function PaymentReminderToasts() {
  const { user, hasPermission } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const lastUserIdRef = useRef(null);

  useEffect(() => {
    const userId = user?.id || user?._id;
    const isNewUserSession = Boolean(userId && lastUserIdRef.current !== userId);
    const isDashboardOpen = location.pathname === '/dashboard';

    if (!userId || !hasPermission(PERMISSIONS.canViewPayments)) {
      return;
    }

    if (!isNewUserSession && !isDashboardOpen) {
      return;
    }

    lastUserIdRef.current = userId;

    let ignore = false;

    async function loadReminders() {
      try {
        const data = await fetchPaymentReminders();

        if (ignore) {
          return;
        }

        (data.supplierReminders || []).forEach((reminder) => {
          showSupplierReminder(toast, reminder);
        });
        (data.customerReminders || []).forEach((reminder) => {
          showCustomerReminder(toast, reminder);
        });
      } catch (error) {
        // Reminder lookup should not interrupt primary navigation.
      }
    }

    loadReminders();

    return () => {
      ignore = true;
    };
  }, [user, hasPermission, location.pathname, toast]);

  return null;
}

export default PaymentReminderToasts;
