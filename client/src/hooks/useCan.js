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
        if (permission.length === 0) {
          return true;
        }

        return permission.some(hasPermission);
      }

      return hasPermission(permission);
    },
    [hasPermission],
  );
}