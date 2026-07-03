import { createContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser, loginUser, logoutUser } from '@/services/authService';
import { storage } from '@/services/storage';

export const AuthContext = createContext(null);

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
      } catch (error) {
        logoutUser();
        setUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    }

    bootstrap();
  }, []);

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
    return Boolean(user?.permissions?.includes(permission));
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
