import { pathToFileURL } from 'node:url';
import { connectDatabase } from '../config/db.js';
import User from '../models/User.js';
import {
  ALL_PERMISSIONS,
  getDefaultPermissionsForRole,
  normalizePermissions,
  ORDER_PERMISSIONS,
  PERMISSIONS,
  ROLE_ORDER_PERMISSIONS,
  ROLES,
} from '../utils/permissions.js';

const LEGACY_ROLE_PERMISSIONS = {
  [ROLES.Boss]: ALL_PERMISSIONS.filter(
    (permission) => permission !== PERMISSIONS.canAssignOrderItemNumber,
  ),

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

function unique(values = []) {
  return [...new Set(values)];
}

function sameSet(left = [], right = []) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);

  if (leftSet.size !== rightSet.size) {
    return false;
  }

  return [...leftSet].every((value) => rightSet.has(value));
}

export function getOrderPermissionsToBackfill(user) {
  const role = user?.role;
  const legacyPermissions = LEGACY_ROLE_PERMISSIONS[role];
  const roleOrderPermissions = ROLE_ORDER_PERMISSIONS[role] || [];

  if (!legacyPermissions || !roleOrderPermissions.length) {
    return [];
  }

  const currentPermissions = normalizePermissions(user.permissions || []);

  if (!sameSet(currentPermissions, legacyPermissions)) {
    return [];
  }

  return roleOrderPermissions.filter(
    (permission) => !currentPermissions.includes(permission),
  );
}

function hasCurrentRoleOrderDefaults(user) {
  const roleOrderPermissions = ROLE_ORDER_PERMISSIONS[user?.role] || [];
  const currentPermissions = normalizePermissions(user.permissions || []);
  const currentDefaults = getDefaultPermissionsForRole(user?.role);

  return (
    roleOrderPermissions.length > 0 &&
    sameSet(currentPermissions, currentDefaults)
  );
}

export function getBackfilledOrderPermissions(user) {
  const currentPermissions = normalizePermissions(user.permissions || []);
  const permissionsToAdd = getOrderPermissionsToBackfill(user);

  if (!permissionsToAdd.length) {
    return currentPermissions;
  }

  return unique([...currentPermissions, ...permissionsToAdd]);
}

export async function backfillOrderPermissions({ userModel = User } = {}) {
  const users = await userModel.find({
    role: { $in: Object.values(ROLES) },
  });

  const summary = {
    scanned: users.length,
    matchedDefaultProfiles: 0,
    modified: 0,
    alreadyCurrent: 0,
    skippedCustom: 0,
    addedPermissions: {},
  };

  for (const user of users) {
    const permissionsToAdd = getOrderPermissionsToBackfill(user);

    if (!permissionsToAdd.length) {
      if (hasCurrentRoleOrderDefaults(user)) {
        summary.alreadyCurrent += 1;
        continue;
      }

      summary.skippedCustom += 1;
      continue;
    }

    summary.matchedDefaultProfiles += 1;
    user.permissions = getBackfilledOrderPermissions(user);
    await user.save();
    summary.modified += 1;

    for (const permission of permissionsToAdd) {
      summary.addedPermissions[permission] =
        (summary.addedPermissions[permission] || 0) + 1;
    }
  }

  return summary;
}

async function runCli() {
  await connectDatabase();
  const summary = await backfillOrderPermissions();

  console.log(
    [
      'Order permission backfill complete:',
      `scanned=${summary.scanned}`,
      `matchedDefaultProfiles=${summary.matchedDefaultProfiles}`,
      `modified=${summary.modified}`,
      `alreadyCurrent=${summary.alreadyCurrent}`,
      `skippedCustom=${summary.skippedCustom}`,
      `orderPermissions=${ORDER_PERMISSIONS.length}`,
    ].join(' '),
  );

  console.log(JSON.stringify(summary.addedPermissions, null, 2));
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  runCli().catch((error) => {
    console.error('Failed to backfill Order permissions', error);
    process.exit(1);
  });
}
