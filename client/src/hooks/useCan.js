import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function useCan() {
  const { hasPermission } = useAuth();

  return useCallback(
    (permission) => {
      if (!permission) {
        return true;
      }

      if (Array.isArray(permission)) {
        return permission.some((item) => hasPermission(item));
      }

      return hasPermission(permission);
    },
    [hasPermission],
  );
}
