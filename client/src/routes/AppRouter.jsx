import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from '@/layouts/AppLayout';
import LoadingPage from '@/components/LoadingPage';
import ProtectedRoute from '@/routes/ProtectedRoute';
import PublicRoute from '@/routes/PublicRoute';

import {
  PERMISSION_GROUPS,
  PERMISSIONS,
} from '@/constants/permissions';

const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage'),
);

const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage'),
);

const PurchaseListPage = lazy(() =>
  import('@/features/purchases/pages/PurchaseListPage'),
);

const AddPurchasePage = lazy(() =>
  import('@/features/purchases/pages/AddPurchasePage'),
);

const EditPurchasePage = lazy(() =>
  import('@/features/purchases/pages/EditPurchasePage'),
);

const PurchaseDetailsPage = lazy(() =>
  import('@/features/purchases/pages/PurchaseDetailsPage'),
);

const SalesListPage = lazy(() =>
  import('@/features/sales/pages/SalesListPage'),
);

const AddSalePage = lazy(() =>
  import('@/features/sales/pages/AddSalePage'),
);

const EditSalePage = lazy(() =>
  import('@/features/sales/pages/EditSalePage'),
);

const SaleDetailsPage = lazy(() =>
  import('@/features/sales/pages/SaleDetailsPage'),
);

const SaleInvoicePreviewPage = lazy(() =>
  import('@/features/sales/pages/SaleInvoicePreviewPage'),
);

const PaymentManagementPage = lazy(() =>
  import(
    '@/features/payment-management/pages/PaymentManagementPage'
  ),
);

const ReportsPage = lazy(() =>
  import('@/features/reports/pages/ReportsPage'),
);

const OrdersPage = lazy(() =>
  import('@/features/orders/pages/OrdersPage'),
);

const StockManagementPage = lazy(() =>
  import('@/features/stock/pages/StockManagementPage'),
);

const FinishedGoodsStockPage = lazy(() =>
  import(
    '@/features/finished-goods-stock/pages/FinishedGoodsStockPage'
  ),
);

const RodProductionPage = lazy(() =>
  import(
    '@/features/rod-productions/pages/RodProductionPage'
  ),
);

const RodStockPage = lazy(() =>
  import('@/features/rod-productions/pages/RodStockPage'),
);

const AddRodProductPage = lazy(() =>
  import('@/features/rod-productions/pages/AddRodProductPage'),
);

const SheetProductionListPage = lazy(() =>
  import(
    '@/features/sheet-productions/pages/SheetProductionListPage'
  ),
);

const AddSheetProductionPage = lazy(() =>
  import(
    '@/features/sheet-productions/pages/AddSheetProductionPage'
  ),
);

const SheetProductionDetailsPage = lazy(() =>
  import(
    '@/features/sheet-productions/pages/SheetProductionDetailsPage'
  ),
);

const EditSheetProductionPage = lazy(() =>
  import(
    '@/features/sheet-productions/pages/EditSheetProductionPage'
  ),
);

const SheetStockPage = lazy(() =>
  import(
    '@/features/sheet-productions/pages/SheetStockPage'
  ),
);

const SheetStockDetailsPage = lazy(() =>
  import(
    '@/features/sheet-productions/pages/SheetStockDetailsPage'
  ),
);

const AddSheetProductPage = lazy(() =>
  import('@/features/sheet-productions/pages/AddSheetProductPage'),
);

const PUProductManufacturingListPage = lazy(() =>
  import(
    '@/features/pu-product-manufacturing/pages/PUProductManufacturingListPage'
  ),
);

const AddPUProductManufacturingPage = lazy(() =>
  import(
    '@/features/pu-product-manufacturing/pages/AddPUProductManufacturingPage'
  ),
);

const PUProductManufacturingDetailsPage = lazy(() =>
  import(
    '@/features/pu-product-manufacturing/pages/PUProductManufacturingDetailsPage'
  ),
);

const EditPUProductManufacturingPage = lazy(() =>
  import(
    '@/features/pu-product-manufacturing/pages/EditPUProductManufacturingPage'
  ),
);

const PUProductStockPage = lazy(() =>
  import(
    '@/features/pu-product-manufacturing/pages/PUProductStockPage'
  ),
);

const PUProductStockDetailsPage = lazy(() =>
  import(
    '@/features/pu-product-manufacturing/pages/PUProductStockDetailsPage'
  ),
);

const UsersPage = lazy(() =>
  import('@/features/users/pages/UsersPage'),
);

const ForbiddenPage = lazy(() =>
  import('@/routes/ForbiddenPage'),
);

const NotFoundPage = lazy(() =>
  import('@/routes/NotFoundPage'),
);

function AppRouter() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route
            path="/login"
            element={<LoginPage />}
          />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route
              index
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
              }
            />

            {/* Dashboard */}
            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSIONS.canViewDashboard
                  }
                />
              }
            >
              <Route
                path="/dashboard"
                element={<DashboardPage />}
              />
            </Route>

            {/* Users */}
            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSIONS.canManageUsers
                  }
                />
              }
            >
              <Route
                path="/users"
                element={<UsersPage />}
              />
            </Route>

            {/* Purchases */}
            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSIONS.canViewPurchase
                  }
                />
              }
            >
              <Route
                path="/purchases"
                element={<PurchaseListPage />}
              />

              <Route
                path="/purchases/:purchaseId"
                element={<PurchaseDetailsPage />}
              />
            </Route>

            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSIONS.canCreatePurchase
                  }
                />
              }
            >
              <Route
                path="/purchases/new"
                element={<AddPurchasePage />}
              />
            </Route>

            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSIONS.canEditPurchase
                  }
                />
              }
            >
              <Route
                path="/purchases/:purchaseId/edit"
                element={<EditPurchasePage />}
              />
            </Route>

            {/* Sales */}
            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSIONS.canViewSales
                  }
                />
              }
            >
              <Route
                path="/sales"
                element={<SalesListPage />}
              />

              <Route
                path="/sales/:saleId"
                element={<SaleDetailsPage />}
              />

              <Route
                path="/sales/:saleId/invoice"
                element={<SaleInvoicePreviewPage />}
              />
            </Route>

            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSIONS.canCreateSales
                  }
                />
              }
            >
              <Route
                path="/sales/new"
                element={<AddSalePage />}
              />
            </Route>

            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSIONS.canEditSales
                  }
                />
              }
            >
              <Route
                path="/sales/:saleId/edit"
                element={<EditSalePage />}
              />
            </Route>

            {/* Payments */}
            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSIONS.canViewPayments
                  }
                />
              }
            >
              <Route
                path="/payment-management"
                element={
                  <PaymentManagementPage />
                }
              />
            </Route>

            {/* Reports */}
            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSIONS.canViewReports
                  }
                />
              }
            >
              <Route
                path="/reports"
                element={<ReportsPage />}
              />
            </Route>

            {/* Orders */}
            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSIONS.canViewOrders
                  }
                />
              }
            >
              <Route
                path="/orders"
                element={<OrdersPage />}
              />
            </Route>

            {/* General Stock */}
            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSIONS.canViewStock
                  }
                />
              }
            >
              <Route
                path="/stock"
                element={
                  <StockManagementPage />
                }
              />

              <Route
                path="/finished-goods-stock"
                element={
                  <FinishedGoodsStockPage />
                }
              />

              <Route
                path="/rod-stocks"
                element={<RodStockPage />}
              />

              <Route
                path="/pu-product-stock"
                element={<PUProductStockPage />}
              />

              <Route
                path="/pu-product-stock/:stockId"
                element={
                  <PUProductStockDetailsPage />
                }
              />
            </Route>

            {/* Rod Production */}
            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSION_GROUPS.viewRodProduction
                  }
                />
              }
            >
              <Route
                path="/rod-productions"
                element={<RodProductionPage />}
              />
            </Route>

            {/* Rod Product */}
            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSION_GROUPS.createRodProduct
                  }
                />
              }
            >
              <Route
                path="/rod-product-manufacturing/new"
                element={<AddRodProductPage />}
              />
            </Route>

            {/* Sheet Production */}
            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSION_GROUPS.viewSheetProduction
                  }
                />
              }
            >
              <Route
                path="/sheet-productions"
                element={
                  <SheetProductionListPage />
                }
              />

              <Route
                path="/sheet-productions/:productionId"
                element={
                  <SheetProductionDetailsPage />
                }
              />
            </Route>

            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSION_GROUPS.createSheetProduction
                  }
                />
              }
            >
              <Route
                path="/sheet-productions/new"
                element={
                  <AddSheetProductionPage />
                }
              />
            </Route>

            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSION_GROUPS.editSheetProduction
                  }
                />
              }
            >
              <Route
                path="/sheet-productions/:productionId/edit"
                element={
                  <EditSheetProductionPage />
                }
              />
            </Route>

            {/* Sheet Stock */}
            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSIONS.canViewSheetStock
                  }
                />
              }
            >
              <Route
                path="/sheet-stock"
                element={<SheetStockPage />}
              />

              <Route
                path="/sheet-stock/:stockId"
                element={
                  <SheetStockDetailsPage />
                }
              />
            </Route>

            {/* Sheet Product */}
            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSION_GROUPS.createSheetProduct
                  }
                />
              }
            >
              <Route
                path="/sheet-product-manufacturing/new"
                element={<AddSheetProductPage />}
              />
            </Route>

            {/* PU Production */}
            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSION_GROUPS.viewPuProduction
                  }
                />
              }
            >
              <Route
                path="/pu-product-manufacturing"
                element={
                  <PUProductManufacturingListPage />
                }
              />

              <Route
                path="/pu-product-manufacturing/:manufacturingId"
                element={
                  <PUProductManufacturingDetailsPage />
                }
              />
            </Route>

            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSION_GROUPS.createPuProduction
                  }
                />
              }
            >
              <Route
                path="/pu-product-manufacturing/new"
                element={
                  <AddPUProductManufacturingPage />
                }
              />
            </Route>

            <Route
              element={
                <ProtectedRoute
                  permission={
                    PERMISSION_GROUPS.editPuProduction
                  }
                />
              }
            >
              <Route
                path="/pu-product-manufacturing/:manufacturingId/edit"
                element={
                  <EditPUProductManufacturingPage />
                }
              />
            </Route>

            <Route
              path="/403"
              element={<ForbiddenPage />}
            />
          </Route>
        </Route>

        <Route
          path="*"
          element={<NotFoundPage />}
        />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
