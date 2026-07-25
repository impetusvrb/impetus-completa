'use strict';

const assert = require('assert');
const {
  WMS_PERMISSIONS,
  WMS_RBAC_PROFILES,
  hasWmsPermission,
  canAccessWmsFoundation
} = require('../../src/domains/logistics-operational/shared/wmsRbacDefinitions');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

console.log('WMS-003 — RBAC Tests\n');

test('permissions catalog defined', () => {
  assert.ok(WMS_PERMISSIONS['warehouse.read']);
  assert.ok(WMS_PERMISSIONS['inventory.write']);
  assert.ok(WMS_PERMISSIONS['shipping.execute']);
});

test('warehouse_operator: read + execute', () => {
  const user = { profile_code: 'warehouse_operator', role: 'operador' };
  assert.strictEqual(hasWmsPermission(user, 'inventory.read'), true);
  assert.strictEqual(hasWmsPermission(user, 'inventory.write'), false);
  assert.strictEqual(hasWmsPermission(user, 'picking.execute'), true);
});

test('warehouse_manager: full permissions', () => {
  const user = { profile_code: 'warehouse_manager', role: 'gerente' };
  for (const perm of Object.keys(WMS_PERMISSIONS)) {
    assert.strictEqual(hasWmsPermission(user, perm), true, perm);
  }
});

test('admin bypass via hierarchy', () => {
  assert.strictEqual(canAccessWmsFoundation({ role: 'admin' }), true);
  assert.strictEqual(canAccessWmsFoundation({ hierarchy_level: 1 }), true);
});

test('profiles activated for WMS-003 API layer', () => {
  assert.ok(WMS_RBAC_PROFILES.every((p) => p.activated === true));
  assert.ok(WMS_RBAC_PROFILES.every((p) => Array.isArray(p.permissions)));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
