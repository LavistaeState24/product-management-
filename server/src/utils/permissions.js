export const PERMISSIONS = {
  canViewDashboard: 'canViewDashboard',
  canManageUsers: 'canManageUsers',
  canViewPurchase: 'canViewPurchase',
  canCreatePurchase: 'canCreatePurchase',
  canEditPurchase: 'canEditPurchase',
  canDeletePurchase: 'canDeletePurchase',
  canViewSales: 'canViewSales',
  canCreateSales: 'canCreateSales',
  canEditSales: 'canEditSales',
  canDeleteSales: 'canDeleteSales',
  canViewStock: 'canViewStock',
  canManageStock: 'canManageStock',
  canViewPayments: 'canViewPayments',
  canManagePayments: 'canManagePayments',
  canViewReports: 'canViewReports',
};

export const ROLES = {
  Boss: 'Boss',
  Staff: 'Staff',
  Accountant: 'Accountant',
  'Sales Person': 'Sales Person',
};

export const ROLE_PERMISSIONS = {
  [ROLES.Boss]: Object.values(PERMISSIONS),
  [ROLES.Staff]: [PERMISSIONS.canViewDashboard],
  [ROLES.Accountant]: [
    PERMISSIONS.canViewDashboard,
    PERMISSIONS.canViewPayments,
    PERMISSIONS.canManagePayments,
    PERMISSIONS.canViewReports,
  ],
  [ROLES['Sales Person']]: [
    PERMISSIONS.canViewDashboard,
    PERMISSIONS.canViewSales,
    PERMISSIONS.canCreateSales,
    PERMISSIONS.canEditSales,
  ],
};
