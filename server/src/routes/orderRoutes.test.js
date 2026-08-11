import assert from 'node:assert/strict';
import test from 'node:test';

import orderRoutes from './orderRoutes.js';
import { PERMISSIONS } from '../utils/permissions.js';

function findRoute(path, method) {
  return orderRoutes.stack.find((layer) => {
    const route = layer.route;

    return route?.path === path && Boolean(route.methods?.[method]);
  })?.route;
}

function getRequiredPermission(path, method) {
  const route = findRoute(path, method);
  const permissionMiddleware = route?.stack.find(
    (layer) => layer.handle.requiredPermission,
  );

  return permissionMiddleware?.handle.requiredPermission;
}

test('Order routes use the expected RBAC permissions', () => {
  assert.equal(getRequiredPermission('/', 'get'), PERMISSIONS.canViewOrders);
  assert.equal(getRequiredPermission('/', 'post'), PERMISSIONS.canCreateOrder);
  assert.equal(
    getRequiredPermission('/:orderId', 'get'),
    PERMISSIONS.canViewOrders,
  );
  assert.equal(
    getRequiredPermission('/:orderId/accept', 'patch'),
    PERMISSIONS.canAcceptOrder,
  );
  assert.equal(
    getRequiredPermission('/:orderId/progress', 'patch'),
    PERMISSIONS.canUpdateOrderProduction,
  );
  assert.equal(
    getRequiredPermission('/:orderId/item-numbers', 'patch'),
    PERMISSIONS.canAssignOrderItemNumber,
  );
  assert.equal(
    getRequiredPermission('/:orderId/ready', 'patch'),
    PERMISSIONS.canMarkOrderReady,
  );
  assert.equal(
    getRequiredPermission('/:orderId/dispatch', 'patch'),
    PERMISSIONS.canDispatchOrder,
  );
  assert.equal(
    getRequiredPermission('/message-logs', 'get'),
    PERMISSIONS.canViewClientMessageLog,
  );
  assert.equal(
    getRequiredPermission('/message-logs/:messageLogId/open-whatsapp', 'post'),
    PERMISSIONS.canShareOrderMessageOnWhatsApp,
  );
});
