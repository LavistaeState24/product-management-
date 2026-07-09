import { Boxes, LayoutDashboard, ReceiptText, ShieldCheck, ShoppingCart } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';

export const SIDEBAR_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    permission: PERMISSIONS.canViewDashboard,
  },
  {
    label: 'Users',
    path: '/users',
    icon: ShieldCheck,
    permission: PERMISSIONS.canManageUsers,
  },
  {
    label: 'Purchases',
    path: '/purchases',
    icon: ReceiptText,
    permission: PERMISSIONS.canViewPurchase,
  },
  {
    label: 'Sales',
    path: '/sales',
    icon: ShoppingCart,
    permission: PERMISSIONS.canViewSales,
  },
  {
    label: 'Stock',
    path: '/stock',
    icon: Boxes,
    permission: PERMISSIONS.canViewStock,
  },
];
