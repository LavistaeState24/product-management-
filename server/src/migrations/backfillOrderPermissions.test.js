import assert from 'node:assert/strict';
import test from 'node:test';

import User from '../models/User.js';
import {
  backfillOrderPermissions,
  getBackfilledOrderPermissions,
  getOrderPermissionsToBackfill,
} from './backfillOrderPermissions.js';
import {
  getDefaultPermissionsForRole,
  PERMISSIONS,
  ROLE_ORDER_PERMISSIONS,
  ROLES,
} from '../utils/permissions.js';

test('new users receive current Order permissions from role defaults', () => {
  const user = new User({
    name: 'Sales User',
    email: 'sales@example.com',
    password: 'Password@123',
    role: ROLES['Sales Person'],
  });

  for (const permission of ROLE_ORDER_PERMISSIONS[ROLES['Sales Person']]) {
    assert.equal(user.permissions.includes(permission), true);
  }
});

test('Order permission backfill adds missing permissions to legacy defaults only', () => {
  const legacySalesUser = {
    role: ROLES['Sales Person'],
    permissions: [
      PERMISSIONS.canViewDashboard,
      PERMISSIONS.canViewStock,
      PERMISSIONS.canViewSales,
      PERMISSIONS.canCreateSales,
      PERMISSIONS.canEditSales,
    ],
  };

  assert.deepEqual(
    getOrderPermissionsToBackfill(legacySalesUser),
    ROLE_ORDER_PERMISSIONS[ROLES['Sales Person']],
  );

  const backfilled = getBackfilledOrderPermissions(legacySalesUser);

  assert.equal(backfilled.includes(PERMISSIONS.canViewOrders), true);
  assert.equal(backfilled.includes(PERMISSIONS.canCreateOrder), true);
  assert.equal(
    backfilled.includes(PERMISSIONS.canViewOrderClientDetails),
    true,
  );
});

test('Order permission backfill preserves custom permission omissions', () => {
  const customSalesUser = {
    role: ROLES['Sales Person'],
    permissions: [
      PERMISSIONS.canViewDashboard,
      PERMISSIONS.canViewSales,
      PERMISSIONS.canViewOrders,
    ],
  };

  assert.deepEqual(getOrderPermissionsToBackfill(customSalesUser), []);
  assert.deepEqual(
    getBackfilledOrderPermissions(customSalesUser),
    customSalesUser.permissions,
  );
});

test('Order permission backfill is idempotent for current defaults', () => {
  const currentProductionUser = {
    role: ROLES.Production,
    permissions: getDefaultPermissionsForRole(ROLES.Production),
  };

  assert.deepEqual(getOrderPermissionsToBackfill(currentProductionUser), []);
  assert.deepEqual(
    getBackfilledOrderPermissions(currentProductionUser),
    currentProductionUser.permissions,
  );
});

test('Order permission migration updates only legacy default users', async () => {
  const legacyUser = {
    role: ROLES.User,
    permissions: [PERMISSIONS.canViewDashboard],
    saved: 0,
    async save() {
      this.saved += 1;
    },
  };
  const customUser = {
    role: ROLES.User,
    permissions: [PERMISSIONS.canViewDashboard, PERMISSIONS.canViewOrders],
    saved: 0,
    async save() {
      this.saved += 1;
    },
  };
  const currentUser = {
    role: ROLES.User,
    permissions: getDefaultPermissionsForRole(ROLES.User),
    saved: 0,
    async save() {
      this.saved += 1;
    },
  };

  const fakeUserModel = {
    async find() {
      return [legacyUser, customUser, currentUser];
    },
  };

  const firstRun = await backfillOrderPermissions({
    userModel: fakeUserModel,
  });
  const secondRun = await backfillOrderPermissions({
    userModel: fakeUserModel,
  });

  assert.equal(firstRun.scanned, 3);
  assert.equal(firstRun.modified, 1);
  assert.equal(firstRun.skippedCustom, 1);
  assert.equal(firstRun.alreadyCurrent, 1);
  assert.equal(legacyUser.saved, 1);
  assert.equal(customUser.saved, 0);
  assert.equal(currentUser.saved, 0);
  assert.equal(legacyUser.permissions.includes(PERMISSIONS.canCreateOrder), true);

  assert.equal(secondRun.modified, 0);
  assert.equal(secondRun.skippedCustom, 1);
  assert.equal(secondRun.alreadyCurrent, 2);
});
