import { LayoutDashboard, ShieldCheck } from 'lucide-react';
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
];
