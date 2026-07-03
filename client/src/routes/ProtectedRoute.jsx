import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingPage from '@/components/LoadingPage';
import { useAuth } from '@/hooks/useAuth';

function ProtectedRoute({ permission }) {
  const { isAuthenticated, isBootstrapping, hasPermission } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
