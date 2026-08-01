import {
  Boxes,
  Factory,
  LayoutDashboard,
  PackageSearch,
  BarChart3,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Warehouse,
  WalletCards,
} from 'lucide-react';
import { PERMISSION_GROUPS, PERMISSIONS } from '@/constants/permissions';

export const SIDEBAR_ITEMS = [
  // Dashboard
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    permission: PERMISSIONS.canViewDashboard,
  },

  // Purchase & Stock
  {
    label: 'Purchases',
    path: '/purchases',
    icon: ReceiptText,
    permission: PERMISSIONS.canViewPurchase,
  },
  {
    label: 'Raw Stock',
    path: '/stock',
    icon: Boxes,
    permission: PERMISSIONS.canViewStock,
  },

  // Rod
  {
    label: 'Rod Production',
    path: '/rod-productions',
    icon: Factory,
    permission: PERMISSION_GROUPS.viewRodProduction,
  },
  {
    label: 'Rod Stock',
    path: '/rod-stocks',
    icon: PackageSearch,
    permission: PERMISSIONS.canViewStock,
  },

  // Sheet
  {
    label: 'Sheet Production',
    path: '/sheet-productions',
    icon: Factory,
    permission: PERMISSION_GROUPS.viewProduction,
  },
  {
    label: 'New Sheet',
    path: '/sheet-productions/new',
    icon: Factory,
    permission: PERMISSION_GROUPS.createProduction,
  },
  {
    label: 'Sheet Stock',
    path: '/sheet-stock',
    icon: PackageSearch,
    permission: PERMISSIONS.canViewSheetStock,
  },

  // PU
  {
    label: 'PU Production',
    path: '/pu-product-manufacturing',
    icon: Factory,
    permission: PERMISSION_GROUPS.viewPuProduction,
  },
  {
    label: 'New PU',
    path: '/pu-product-manufacturing/new',
    icon: Factory,
    permission: PERMISSION_GROUPS.createPuProduction,
  },
  {
    label: 'PU Stock',
    path: '/pu-product-stock',
    icon: PackageSearch,
    permission: PERMISSIONS.canViewStock,
  },

  // Sales
  {
    label: 'Finished Goods',
    path: '/finished-goods-stock',
    icon: Warehouse,
    permission: PERMISSIONS.canViewStock,
  },
  {
    label: 'Sales',
    path: '/sales',
    icon: ShoppingCart,
    permission: PERMISSIONS.canViewSales,
  },
  {
    label: 'Payments',
    path: '/payment-management',
    icon: WalletCards,
    permission: PERMISSIONS.canViewPayments,
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: BarChart3,
    permission: PERMISSIONS.canViewReports,
  },

  // Admin
  {
    label: 'Users',
    path: '/users',
    icon: ShieldCheck,
    permission: PERMISSIONS.canManageUsers,
  },
];
