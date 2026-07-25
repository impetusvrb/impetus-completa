'use strict';

const assert = require('assert');
const {
  SUPPLY_PERMISSIONS,
  SUPPLY_RBAC_PROFILES,
  hasSupplyPermission,
  canAccessSupplyFoundation
} = require('../../src/domains/supply/shared/supplyRbacDefinitions');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

(async () => {
  console.log('GF-027 — Supply RBAC Tests\n');

  await test('permissions defined (8)', async () => {
    assert.strictEqual(Object.keys(SUPPLY_PERMISSIONS).length, 8);
    assert.ok(SUPPLY_PERMISSIONS['purchase.order']);
    assert.ok(SUPPLY_PERMISSIONS['approval.execute']);
  });

  await test('profiles activated (3)', async () => {
    assert.strictEqual(SUPPLY_RBAC_PROFILES.length, 3);
    assert.ok(SUPPLY_RBAC_PROFILES.every((p) => p.activated === true));
  });

  await test('procurement_analyst: read + request only', async () => {
    const user = { profile_code: 'procurement_analyst', role: 'gerente', hierarchy_level: 3 };
    assert.strictEqual(hasSupplyPermission(user, 'supply.read'), true);
    assert.strictEqual(hasSupplyPermission(user, 'purchase.request'), true);
    assert.strictEqual(hasSupplyPermission(user, 'purchase.order'), false);
    assert.strictEqual(hasSupplyPermission(user, 'contract.manage'), false);
  });

  await test('manager_supply: full permissions', async () => {
    const user = { profile_code: 'manager_supply', role: 'gerente', hierarchy_level: 2 };
    for (const perm of Object.keys(SUPPLY_PERMISSIONS)) {
      assert.strictEqual(hasSupplyPermission(user, perm), true, perm);
    }
  });

  await test('admin bypass', async () => {
    const user = { role: 'admin', hierarchy_level: 0 };
    assert.strictEqual(canAccessSupplyFoundation(user), true);
    assert.strictEqual(hasSupplyPermission(user, 'contract.manage'), true);
  });

  await test('unknown profile: view only', async () => {
    const user = { profile_code: 'unknown', role: 'tecnic' };
    assert.strictEqual(hasSupplyPermission(user, 'supply.read'), true);
    assert.strictEqual(hasSupplyPermission(user, 'supply.write'), false);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
