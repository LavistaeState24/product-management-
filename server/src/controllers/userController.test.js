import assert from 'node:assert/strict';
import test from 'node:test';

import { getUserManagementOptions } from './userController.js';
import { ASSIGNABLE_ROLES } from '../utils/permissions.js';

test('getUserManagementOptions returns role and permission metadata', async () => {
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

  await getUserManagementOptions({}, res);

  assert.equal(statusCode, 200);
  assert.deepEqual(payload.roles, [...ASSIGNABLE_ROLES]);
  assert.ok(Array.isArray(payload.permissions));
  assert.ok(payload.modulePermissions);
  assert.ok(payload.rolePermissions);
});
