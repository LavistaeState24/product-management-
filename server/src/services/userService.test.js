import assert from 'node:assert/strict';
import test from 'node:test';

import RolePermission from '../models/RolePermission.js';
import User from '../models/User.js';
import { ROLES } from '../utils/permissions.js';
import { updateRolePermissions } from './userService.js';

test('role permission updates persist the profile and update assigned users', async () => {
  const originalFindOneAndUpdate = RolePermission.findOneAndUpdate;
  const originalUpdateMany = User.updateMany;
  const calls = {};
  RolePermission.findOneAndUpdate = async (...args) => {
    calls.profile = args;
  };
  User.updateMany = async (...args) => {
    calls.users = args;
  };

  try {
    const permissions = [
      'canViewDashboard',
      'canDeletePurchase',
    ];

    assert.deepEqual(
      await updateRolePermissions(ROLES.Staff, permissions),
      permissions,
    );
    assert.deepEqual(calls.profile[0], { role: ROLES.Staff });
    assert.deepEqual(calls.profile[1], {
      $set: { permissions },
    });
    assert.deepEqual(calls.users, [
      { role: ROLES.Staff },
      { $set: { permissions } },
    ]);
  } finally {
    RolePermission.findOneAndUpdate = originalFindOneAndUpdate;
    User.updateMany = originalUpdateMany;
  }
});

test('Boss permissions cannot be customized', async () => {
  await assert.rejects(
    updateRolePermissions(ROLES.Boss, []),
    /Boss always has full access and cannot be customized/,
  );
});
