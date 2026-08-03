import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALL_PERMISSIONS,
  ASSIGNABLE_ROLES,
  getDefaultPermissionsForRole,
  getEffectivePermissions,
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
