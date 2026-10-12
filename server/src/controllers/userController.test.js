import assert from 'node:assert/strict';
import test from 'node:test';

import { getUserManagementOptions } from './userController.js';
import RolePermission from '../models/RolePermission.js';
import {
  ALL_PERMISSIONS,
  ASSIGNABLE_ROLES,
  ROLE_PERMISSIONS,
  ROLES,
} from '../utils/permissions.js';

test('getUserManagementOptions returns role and permission metadata', async () => {
  const originalFind = RolePermission.find;
  RolePermission.find = () => ({
    lean: async () => [
      {
        role: ROLES.Accountant,
        permissions: ['canViewDashboard'],
      },
    ],
  });

  let statusCode;
  let payload;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
  };

  try {
    await getUserManagementOptions({}, res);

    assert.equal(statusCode, 200);
    assert.deepEqual(payload.roles, [...ASSIGNABLE_ROLES]);
    assert.deepEqual(payload.permissions, [...ALL_PERMISSIONS]);
    assert.ok(payload.modulePermissions);
    assert.deepEqual(
      payload.rolePermissions[ROLES.Accountant],
      ['canViewDashboard'],
    );
    assert.deepEqual(
      payload.rolePermissions[ROLES.Staff],
      [...ROLE_PERMISSIONS[ROLES.Staff]],
    );
    assert.deepEqual(
      payload.rolePermissions[ROLES.Boss],
      [...ALL_PERMISSIONS],
    );
  } finally {
    RolePermission.find = originalFind;
  }
});
