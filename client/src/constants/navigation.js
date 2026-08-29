import {
  BarChart3,
  Boxes,
  ClipboardList,
  Factory,
  LayoutDashboard,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Warehouse,
  WalletCards,
} from 'lucide-react';

import {
  PERMISSION_GROUPS,
  PERMISSIONS,
} from '@/constants/permissions';

export const SIDEBAR_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    permission: PERMISSIONS.canViewDashboard,
  },

  {
    label: 'Purchases',
    path: '/purchases',
    icon: ReceiptText,
    permission: PERMISSIONS.canViewPurchase,
  },

  {
    label: 'Raw Materials',
    path: '/stock',
    icon: Boxes,
    permission: PERMISSIONS.canViewStock,
  },

  {
    label: 'Rod Production',
    path: '/rod-productions',
    icon: Factory,
    permission: PERMISSION_GROUPS.viewProduction,
  },

  {
    label: 'Rod Stock',
    path: '/rod-stocks',
    icon: PackageSearch,
    permission: PERMISSIONS.canViewStock,
  },

  {
    label: 'Rod Products',
    path: '/rod-product-manufacturing/new',
    icon: Factory,
    permission: PERMISSION_GROUPS.createRodProduct,
  },

  {
    label: 'Sheet Production',
    path: '/sheet-productions',
    icon: Factory,
    permission: PERMISSION_GROUPS.viewProduction,
  },

  {
    label: 'Add Sheet',
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

  {
    label: 'Sheet Products',
    path: '/sheet-product-manufacturing/new',
    icon: Factory,
    permission: PERMISSION_GROUPS.createSheetProduct,
  },

  {
    label: 'PU Production',
    path: '/pu-product-manufacturing',
    icon: Factory,
    permission: PERMISSION_GROUPS.viewProduction,
  },

  {
    label: 'Add PU Product',
    path: '/pu-product-manufacturing/new',
    icon: Factory,
    permission: PERMISSION_GROUPS.createProduction,
  },

  {
    label: 'PU Products',
    path: '/pu-product-stock',
    icon: PackageSearch,
    permission: PERMISSIONS.canViewStock,
  },

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
    label: 'Orders',
    path: '/orders',
    icon: ClipboardList,
    permission: PERMISSIONS.canViewOrders,
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

  {
    label: 'Users',
    path: '/users',
    icon: ShieldCheck,
    permission: PERMISSIONS.canManageUsers,
  },
];