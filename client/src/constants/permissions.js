export const PERMISSIONS = {
  canViewDashboard: 'canViewDashboard',
  canManageUsers: 'canManageUsers',

  canViewPurchase: 'canViewPurchase',
  canCreatePurchase: 'canCreatePurchase',
  canEditPurchase: 'canEditPurchase',
  canDeletePurchase: 'canDeletePurchase',

  canViewProduction: 'canViewProduction',
  canCreateProduction: 'canCreateProduction',
  canEditProduction: 'canEditProduction',
  canDeleteProduction: 'canDeleteProduction',

  canViewSales: 'canViewSales',
  canCreateSales: 'canCreateSales',
  canEditSales: 'canEditSales',
  canDeleteSales: 'canDeleteSales',

  canViewStock: 'canViewStock',
  canManageStock: 'canManageStock',
  canCreateStock: 'canCreateStock',
  canEditStock: 'canEditStock',
  canDeleteStock: 'canDeleteStock',

  canViewSheetProduction: 'canViewSheetProduction',
  canCreateSheetProduction: 'canCreateSheetProduction',
  canUpdateSheetProduction: 'canUpdateSheetProduction',
  canDeleteSheetProduction: 'canDeleteSheetProduction',
  canViewSheetStock: 'canViewSheetStock',

  canViewPayments: 'canViewPayments',
  canManagePayments: 'canManagePayments',
  canCreatePayments: 'canCreatePayments',
  canEditPayments: 'canEditPayments',
  canDeletePayments: 'canDeletePayments',

  canViewReports: 'canViewReports',
  canCreateReports: 'canCreateReports',
  canEditReports: 'canEditReports',
  canDeleteReports: 'canDeleteReports',
};

export const ROLES = {
  Boss: 'Boss',
  Accountant: 'Accountant',
  Staff: 'Staff',
  User: 'User',
  SalesPerson: 'Sales Person',
  StockIncharge: 'Stock Incharge',
  Production: 'Production',
};

export const ASSIGNABLE_ROLES = [
  ROLES.Boss,
  ROLES.Accountant,
  ROLES.Staff,
  ROLES.SalesPerson,
  ROLES.StockIncharge,
  ROLES.Production,
  ROLES.User,
];

export const PERMISSION_GROUPS = {
  viewProduction: [
    PERMISSIONS.canViewProduction,
    PERMISSIONS.canViewSheetProduction,
  ],

  createProduction: [
    PERMISSIONS.canCreateProduction,
    PERMISSIONS.canCreateSheetProduction,
  ],

  editProduction: [
    PERMISSIONS.canEditProduction,
    PERMISSIONS.canUpdateSheetProduction,
  ],

  deleteProduction: [
    PERMISSIONS.canDeleteProduction,
    PERMISSIONS.canDeleteSheetProduction,
  ],

  viewPurchase: [
    PERMISSIONS.canViewPurchase,
  ],

  createPurchase: [
    PERMISSIONS.canCreatePurchase,
  ],

  editPurchase: [
    PERMISSIONS.canEditPurchase,
  ],

  deletePurchase: [
    PERMISSIONS.canDeletePurchase,
  ],

  viewSales: [
    PERMISSIONS.canViewSales,
  ],

  createSales: [
    PERMISSIONS.canCreateSales,
  ],

  editSales: [
    PERMISSIONS.canEditSales,
  ],

  deleteSales: [
    PERMISSIONS.canDeleteSales,
  ],

  viewStock: [
    PERMISSIONS.canViewStock,
    PERMISSIONS.canViewSheetStock,
  ],

  createStock: [
    PERMISSIONS.canCreateStock,
    PERMISSIONS.canManageStock,
  ],

  editStock: [
    PERMISSIONS.canEditStock,
    PERMISSIONS.canManageStock,
  ],

  deleteStock: [
    PERMISSIONS.canDeleteStock,
  ],

  viewPayments: [
    PERMISSIONS.canViewPayments,
    PERMISSIONS.canManagePayments,
  ],

  createPayments: [
    PERMISSIONS.canCreatePayments,
    PERMISSIONS.canManagePayments,
  ],

  editPayments: [
    PERMISSIONS.canEditPayments,
    PERMISSIONS.canManagePayments,
  ],

  deletePayments: [
    PERMISSIONS.canDeletePayments,
  ],

  viewReports: [
    PERMISSIONS.canViewReports,
  ],

  createReports: [
    PERMISSIONS.canCreateReports,
  ],

  editReports: [
    PERMISSIONS.canEditReports,
  ],

  deleteReports: [
    PERMISSIONS.canDeleteReports,
  ],
};
