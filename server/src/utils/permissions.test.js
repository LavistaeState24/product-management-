import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALL_PERMISSIONS,
  ASSIGNABLE_ROLES,
  getDefaultPermissionsForRole,
  getEffectivePermissions,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
} from './permissions.js';

test('every assignable role has a permission profile', () => {
  for (const role of ASSIGNABLE_ROLES) {
    assert.ok(
      Array.isArray(ROLE_PERMISSIONS[role]),
      `${role} must be present in ROLE_PERMISSIONS`,
    );
  }
});

test('role permission profiles only contain known permissions', () => {
  const knownPermissions = new Set(ALL_PERMISSIONS);

  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    for (const permission of permissions) {
      assert.ok(
        knownPermissions.has(permission),
        `${role} includes unknown permission ${permission}`,
      );
    }
  }
});

test('default role permissions are defensive copies', () => {
  const permissions = getDefaultPermissionsForRole(ROLES.Accountant);
  permissions.push('unknownPermission');

  assert.equal(
    ROLE_PERMISSIONS[ROLES.Accountant].includes('unknownPermission'),
    false,
  );
});

test('Boss effective permissions always include all permissions', () => {
  assert.deepEqual(
    getEffectivePermissions({
      role: ROLES.Boss,
      permissions: [],
    }),
    [...ALL_PERMISSIONS],
  );
});

test('Production receives only production-safe order permissions', () => {
  const productionPermissions = new Set(ROLE_PERMISSIONS[ROLES.Production]);

  assert.equal(productionPermissions.has(PERMISSIONS.canViewOrders), true);
  assert.equal(productionPermissions.has(PERMISSIONS.canAcceptOrder), true);
  assert.equal(
    productionPermissions.has(PERMISSIONS.canUpdateOrderProduction),
    true,
  );
  assert.equal(
    productionPermissions.has(PERMISSIONS.canAssignOrderItemNumber),
    true,
  );
  assert.equal(productionPermissions.has(PERMISSIONS.canMarkOrderReady), true);

  assert.equal(productionPermissions.has(PERMISSIONS.canCreateOrder), false);
  assert.equal(productionPermissions.has(PERMISSIONS.canDispatchOrder), false);
  assert.equal(
    productionPermissions.has(PERMISSIONS.canViewOrderClientDetails),
    false,
  );
  assert.equal(
    productionPermissions.has(PERMISSIONS.canViewClientMessageLog),
    false,
  );
  assert.equal(
    productionPermissions.has(PERMISSIONS.canShareOrderMessageOnWhatsApp),
    false,
  );
});

test('client-facing roles receive order create and client detail access', () => {
  for (const role of [ROLES['Sales Person'], ROLES.Staff, ROLES.User]) {
    const permissions = new Set(ROLE_PERMISSIONS[role]);

    assert.equal(permissions.has(PERMISSIONS.canViewOrders), true);
    assert.equal(permissions.has(PERMISSIONS.canCreateOrder), true);
    assert.equal(
      permissions.has(PERMISSIONS.canViewOrderClientDetails),
      true,
    );
    assert.equal(permissions.has(PERMISSIONS.canDispatchOrder), false);
    assert.equal(
      permissions.has(PERMISSIONS.canViewClientMessageLog),
      false,
    );
    assert.equal(
      permissions.has(PERMISSIONS.canShareOrderMessageOnWhatsApp),
      false,
    );
  }
});

test('Accountant receives read-only order client detail access', () => {
  const permissions = new Set(ROLE_PERMISSIONS[ROLES.Accountant]);

  assert.equal(permissions.has(PERMISSIONS.canViewOrders), true);
  assert.equal(
    permissions.has(PERMISSIONS.canViewOrderClientDetails),
    true,
  );
  assert.equal(permissions.has(PERMISSIONS.canCreateOrder), false);
  assert.equal(permissions.has(PERMISSIONS.canDispatchOrder), false);
  assert.equal(
    permissions.has(PERMISSIONS.canViewClientMessageLog),
    false,
  );
  assert.equal(
    permissions.has(PERMISSIONS.canShareOrderMessageOnWhatsApp),
    false,
  );
});

test('Stock Incharge receives production-safe assignment access only', () => {
  const permissions = new Set(ROLE_PERMISSIONS[ROLES['Stock Incharge']]);

  assert.equal(permissions.has(PERMISSIONS.canViewOrders), true);
  assert.equal(
    permissions.has(PERMISSIONS.canAssignOrderItemNumber),
    true,
  );
  assert.equal(permissions.has(PERMISSIONS.canCreateOrder), false);
  assert.equal(permissions.has(PERMISSIONS.canDispatchOrder), false);
  assert.equal(
    permissions.has(PERMISSIONS.canViewOrderClientDetails),
    false,
  );
  assert.equal(
    permissions.has(PERMISSIONS.canViewClientMessageLog),
    false,
  );
  assert.equal(
    permissions.has(PERMISSIONS.canShareOrderMessageOnWhatsApp),
    false,
  );
});
