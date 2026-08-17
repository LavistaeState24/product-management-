import { formatDateTime } from '@/features/purchases/utils/purchaseHelpers';

export function formatUserLastLogin(user) {
  return formatDateTime(user?.lastLoginAt);
}

export function formatUserLastSeen(user) {
  if (!user?.lastLoginAt && !user?.lastSeenAt) {
    return 'Not available';
  }

  if (user?.isOnline) {
    return 'Online';
  }

  return formatDateTime(user?.lastSeenAt);
}
