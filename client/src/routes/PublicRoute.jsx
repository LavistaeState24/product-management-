import { Navigate, Outlet } from 'react-router-dom';
import LoadingPage from '@/components/LoadingPage';
import { useAuth } from '@/hooks/useAuth';

function PublicRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <LoadingPage />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default PublicRoute;
