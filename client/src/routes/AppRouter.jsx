import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout';
import LoadingPage from '@/components/LoadingPage';
import ProtectedRoute from '@/routes/ProtectedRoute';
import PublicRoute from '@/routes/PublicRoute';
import { PERMISSIONS } from '@/constants/permissions';

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const PurchaseListPage = lazy(() => import('@/features/purchases/pages/PurchaseListPage'));
const AddPurchasePage = lazy(() => import('@/features/purchases/pages/AddPurchasePage'));
const EditPurchasePage = lazy(() => import('@/features/purchases/pages/EditPurchasePage'));
const PurchaseDetailsPage = lazy(() => import('@/features/purchases/pages/PurchaseDetailsPage'));
const SalesListPage = lazy(() => import('@/features/sales/pages/SalesListPage'));
const AddSalePage = lazy(() => import('@/features/sales/pages/AddSalePage'));
const EditSalePage = lazy(() => import('@/features/sales/pages/EditSalePage'));
const SaleDetailsPage = lazy(() => import('@/features/sales/pages/SaleDetailsPage'));
const SaleInvoicePreviewPage = lazy(() => import('@/features/sales/pages/SaleInvoicePreviewPage'));
const StockManagementPage = lazy(() => import('@/features/stock/pages/StockManagementPage'));
const FinishedGoodsStockPage = lazy(
  () => import('@/features/finished-goods-stock/pages/FinishedGoodsStockPage'),
);
const RodProductionPage = lazy(() => import('@/features/rod-productions/pages/RodProductionPage'));
const RodStockPage = lazy(() => import('@/features/rod-productions/pages/RodStockPage'));
const SheetProductionListPage = lazy(
  () => import('@/features/sheet-productions/pages/SheetProductionListPage'),
);
const AddSheetProductionPage = lazy(
  () => import('@/features/sheet-productions/pages/AddSheetProductionPage'),
);
const SheetProductionDetailsPage = lazy(
  () => import('@/features/sheet-productions/pages/SheetProductionDetailsPage'),
);
const EditSheetProductionPage = lazy(
  () => import('@/features/sheet-productions/pages/EditSheetProductionPage'),
);
const SheetStockPage = lazy(() => import('@/features/sheet-productions/pages/SheetStockPage'));
const SheetStockDetailsPage = lazy(
  () => import('@/features/sheet-productions/pages/SheetStockDetailsPage'),
);
const PUProductManufacturingListPage = lazy(
  () => import('@/features/pu-product-manufacturing/pages/PUProductManufacturingListPage'),
);
const AddPUProductManufacturingPage = lazy(
  () => import('@/features/pu-product-manufacturing/pages/AddPUProductManufacturingPage'),
);
const PUProductManufacturingDetailsPage = lazy(
  () => import('@/features/pu-product-manufacturing/pages/PUProductManufacturingDetailsPage'),
);
const EditPUProductManufacturingPage = lazy(
  () => import('@/features/pu-product-manufacturing/pages/EditPUProductManufacturingPage'),
);
const PUProductStockPage = lazy(
  () => import('@/features/pu-product-manufacturing/pages/PUProductStockPage'),
);
const PUProductStockDetailsPage = lazy(
  () => import('@/features/pu-product-manufacturing/pages/PUProductStockDetailsPage'),
);
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
            <Route element={<ProtectedRoute permission={PERMISSIONS.canViewPurchase} />}>
              <Route path="/purchases" element={<PurchaseListPage />} />
              <Route path="/purchases/:purchaseId" element={<PurchaseDetailsPage />} />
            </Route>
            <Route element={<ProtectedRoute permission={PERMISSIONS.canCreatePurchase} />}>
              <Route path="/purchases/new" element={<AddPurchasePage />} />
            </Route>
            <Route element={<ProtectedRoute permission={PERMISSIONS.canEditPurchase} />}>
              <Route path="/purchases/:purchaseId/edit" element={<EditPurchasePage />} />
            </Route>
            <Route element={<ProtectedRoute permission={PERMISSIONS.canViewSales} />}>
              <Route path="/sales" element={<SalesListPage />} />
              <Route path="/sales/:saleId" element={<SaleDetailsPage />} />
              <Route path="/sales/:saleId/invoice" element={<SaleInvoicePreviewPage />} />
            </Route>
            <Route element={<ProtectedRoute permission={PERMISSIONS.canCreateSales} />}>
              <Route path="/sales/new" element={<AddSalePage />} />
            </Route>
            <Route element={<ProtectedRoute permission={PERMISSIONS.canEditSales} />}>
              <Route path="/sales/:saleId/edit" element={<EditSalePage />} />
            </Route>
            <Route element={<ProtectedRoute permission={PERMISSIONS.canViewStock} />}>
              <Route path="/stock" element={<StockManagementPage />} />
              <Route path="/finished-goods-stock" element={<FinishedGoodsStockPage />} />
              <Route path="/rod-stocks" element={<RodStockPage />} />
            </Route>
            <Route element={<ProtectedRoute permission={PERMISSIONS.canManageStock} />}>
              <Route path="/rod-productions" element={<RodProductionPage />} />
            </Route>
            <Route element={<ProtectedRoute permission={PERMISSIONS.canViewSheetProduction} />}>
              <Route path="/sheet-productions" element={<SheetProductionListPage />} />
              <Route path="/sheet-productions/:productionId" element={<SheetProductionDetailsPage />} />
            </Route>
            <Route element={<ProtectedRoute permission={PERMISSIONS.canCreateSheetProduction} />}>
              <Route path="/sheet-productions/new" element={<AddSheetProductionPage />} />
            </Route>
            <Route element={<ProtectedRoute permission={PERMISSIONS.canUpdateSheetProduction} />}>
              <Route path="/sheet-productions/:productionId/edit" element={<EditSheetProductionPage />} />
            </Route>
            <Route element={<ProtectedRoute permission={PERMISSIONS.canViewSheetStock} />}>
              <Route path="/sheet-stock" element={<SheetStockPage />} />
              <Route path="/sheet-stock/:stockId" element={<SheetStockDetailsPage />} />
            </Route>
            <Route element={<ProtectedRoute permission={PERMISSIONS.canViewStock} />}>
              <Route path="/pu-product-manufacturing" element={<PUProductManufacturingListPage />} />
              <Route path="/pu-product-manufacturing/:manufacturingId" element={<PUProductManufacturingDetailsPage />} />
              <Route path="/pu-product-stock" element={<PUProductStockPage />} />
              <Route path="/pu-product-stock/:stockId" element={<PUProductStockDetailsPage />} />
            </Route>
            <Route element={<ProtectedRoute permission={PERMISSIONS.canManageStock} />}>
              <Route path="/pu-product-manufacturing/new" element={<AddPUProductManufacturingPage />} />
              <Route path="/pu-product-manufacturing/:manufacturingId/edit" element={<EditPUProductManufacturingPage />} />
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
