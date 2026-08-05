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

  canViewOrders: 'canViewOrders',
  canCreateOrder: 'canCreateOrder',
  canAcceptOrder: 'canAcceptOrder',
  canUpdateOrderProduction: 'canUpdateOrderProduction',
  canMarkOrderReady: 'canMarkOrderReady',
  canDispatchOrder: 'canDispatchOrder',
  canViewOrderClientDetails: 'canViewOrderClientDetails',
  canViewClientMessageLog: 'canViewClientMessageLog',
  canShareOrderMessageOnWhatsApp: 'canShareOrderMessageOnWhatsApp',
};

export const ROLES = {
  Boss: 'Boss',
  Staff: 'Staff',
  Accountant: 'Accountant',
  'Sales Person': 'Sales Person',
  User: 'User',
  'Stock Incharge': 'Stock Incharge',
  Production: 'Production',
};

export const ASSIGNABLE_ROLES = Object.freeze([
  ROLES.Boss,
  ROLES.Accountant,
  ROLES.Staff,
  ROLES['Sales Person'],
  ROLES['Stock Incharge'],
  ROLES.Production,
  ROLES.User,
]);

export const CRM_MODULE_PERMISSIONS = {
  Dashboard: {
    view: PERMISSIONS.canViewDashboard,
  },

  Users: {
    view: PERMISSIONS.canManageUsers,
    create: PERMISSIONS.canManageUsers,
    edit: PERMISSIONS.canManageUsers,
    delete: PERMISSIONS.canManageUsers,
  },

  Purchase: {
    view: PERMISSIONS.canViewPurchase,
    create: PERMISSIONS.canCreatePurchase,
    edit: PERMISSIONS.canEditPurchase,
    delete: PERMISSIONS.canDeletePurchase,
  },

  Production: {
    view: PERMISSIONS.canViewProduction,
    create: PERMISSIONS.canCreateProduction,
    edit: PERMISSIONS.canEditProduction,
    delete: PERMISSIONS.canDeleteProduction,
  },

  Stock: {
    view: PERMISSIONS.canViewStock,
    create: PERMISSIONS.canCreateStock,
    edit: PERMISSIONS.canEditStock,
    delete: PERMISSIONS.canDeleteStock,
  },

  Sales: {
    view: PERMISSIONS.canViewSales,
    create: PERMISSIONS.canCreateSales,
    edit: PERMISSIONS.canEditSales,
    delete: PERMISSIONS.canDeleteSales,
  },

  Payments: {
    view: PERMISSIONS.canViewPayments,
    create: PERMISSIONS.canCreatePayments,
    edit: PERMISSIONS.canEditPayments,
    delete: PERMISSIONS.canDeletePayments,
  },

  Reports: {
    view: PERMISSIONS.canViewReports,
    create: PERMISSIONS.canCreateReports,
    edit: PERMISSIONS.canEditReports,
    delete: PERMISSIONS.canDeleteReports,
  },

  Orders: {
    view: PERMISSIONS.canViewOrders,
    create: PERMISSIONS.canCreateOrder,
    accept: PERMISSIONS.canAcceptOrder,
    updateProduction: PERMISSIONS.canUpdateOrderProduction,
    markReady: PERMISSIONS.canMarkOrderReady,
    dispatch: PERMISSIONS.canDispatchOrder,
    viewClientDetails: PERMISSIONS.canViewOrderClientDetails,
    viewMessageLog: PERMISSIONS.canViewClientMessageLog,
    shareWhatsApp: PERMISSIONS.canShareOrderMessageOnWhatsApp,
  },
};

export const ALL_PERMISSIONS = Object.freeze(
  Object.values(PERMISSIONS),
);

export const ROLE_PERMISSIONS = {
  [ROLES.Boss]: ALL_PERMISSIONS,

  [ROLES.User]: [
    PERMISSIONS.canViewDashboard,
  ],

  [ROLES.Staff]: [
    PERMISSIONS.canViewDashboard,
  ],

  [ROLES.Accountant]: [
    PERMISSIONS.canViewDashboard,

    PERMISSIONS.canViewPurchase,
    PERMISSIONS.canCreatePurchase,
    PERMISSIONS.canEditPurchase,

    PERMISSIONS.canViewSales,
    PERMISSIONS.canViewStock,

    PERMISSIONS.canViewPayments,
    PERMISSIONS.canManagePayments,
    PERMISSIONS.canCreatePayments,
    PERMISSIONS.canEditPayments,

    PERMISSIONS.canViewReports,
  ],

  [ROLES['Sales Person']]: [
    PERMISSIONS.canViewDashboard,
    PERMISSIONS.canViewStock,

    PERMISSIONS.canViewSales,
    PERMISSIONS.canCreateSales,
    PERMISSIONS.canEditSales,
  ],

  [ROLES['Stock Incharge']]: [
    PERMISSIONS.canViewDashboard,

    PERMISSIONS.canViewPurchase,

    PERMISSIONS.canViewStock,
    PERMISSIONS.canManageStock,
    PERMISSIONS.canCreateStock,
    PERMISSIONS.canEditStock,

    PERMISSIONS.canViewSheetStock,
  ],

  [ROLES.Production]: [
    PERMISSIONS.canViewDashboard,

    PERMISSIONS.canViewStock,
    PERMISSIONS.canViewSheetStock,

    PERMISSIONS.canViewProduction,
    PERMISSIONS.canCreateProduction,
    PERMISSIONS.canEditProduction,

    PERMISSIONS.canViewSheetProduction,
    PERMISSIONS.canCreateSheetProduction,
    PERMISSIONS.canUpdateSheetProduction,

    PERMISSIONS.canViewOrders,
    PERMISSIONS.canAcceptOrder,
    PERMISSIONS.canUpdateOrderProduction,
    PERMISSIONS.canMarkOrderReady,
  ],
};

export function getDefaultPermissionsForRole(role) {
  return [...(ROLE_PERMISSIONS[role] || [])];
}

export function normalizePermissions(permissions = []) {
  if (!Array.isArray(permissions)) {
    return [];
  }

  const knownPermissions = new Set(ALL_PERMISSIONS);

  return [...new Set(permissions)].filter((permission) =>
    knownPermissions.has(permission),
  );
}

export function getEffectivePermissions(user) {
  if (user?.role === ROLES.Boss) {
    return [...ALL_PERMISSIONS];
  }

  return normalizePermissions(user?.permissions || []);
}