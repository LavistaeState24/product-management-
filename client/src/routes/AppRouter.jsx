import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout';
import LoadingPage from '@/components/LoadingPage';
import ProtectedRoute from '@/routes/ProtectedRoute';
import PublicRoute from '@/routes/PublicRoute';
import { PERMISSIONS } from '@/constants/permissions';

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'));
const ForbiddenPage = lazy(() => import('@/routes/ForbiddenPage'));
const NotFoundPage = lazy(() => import('@/routes/NotFoundPage'));

function AppRouter() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route element={<ProtectedRoute permission={PERMISSIONS.canViewDashboard} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
            <Route element={<ProtectedRoute permission={PERMISSIONS.canManageUsers} />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
            <Route path="/403" element={<ForbiddenPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
