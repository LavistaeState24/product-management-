import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingPage from '@/components/LoadingPage';
import { useAuth } from '@/hooks/useAuth';
import { useCan } from '@/hooks/useCan';

function ProtectedRoute({ permission }) {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const can = useCan();
  const location = useLocation();

  if (isBootstrapping) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!can(permission)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
