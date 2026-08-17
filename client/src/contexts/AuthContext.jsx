import { createContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser, loginUser, logoutUser } from '@/services/authService';
import { storage } from '@/services/storage';
import { ROLES } from '@/constants/permissions';

export const AuthContext = createContext(null);

const ACTIVITY_REFRESH_INTERVAL_MS = 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      const token = storage.getToken();

      if (!token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const response = await fetchCurrentUser();
        setUser(response.user);
      } catch {
        logoutUser();
        setUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const refreshActivity = async () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      try {
        const response = await fetchCurrentUser();
        setUser(response.user);
      } catch (error) {
        if (error?.response?.status === 401) {
          logoutUser();
          setUser(null);
        }
      }
    };

    const intervalId = window.setInterval(
      refreshActivity,
      ACTIVITY_REFRESH_INTERVAL_MS,
    );

    return () => window.clearInterval(intervalId);
  }, [user?.id]);

  async function signIn(values) {
    setIsSubmitting(true);

    try {
      const response = await loginUser(values);
      setUser(response.user);
      return response.user;
    } finally {
      setIsSubmitting(false);
    }
  }

  function signOut() {
    logoutUser();
    setUser(null);
  }

  function hasPermission(permission) {
    if (!user) {
      return false;
    }

    // Boss always has access
    if (user.role === ROLES.Boss) {
      return true;
    }

    return user.permissions?.includes(permission) ?? false;
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      isSubmitting,
      signIn,
      signOut,
      hasPermission,
    }),
    [user, isBootstrapping, isSubmitting],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
