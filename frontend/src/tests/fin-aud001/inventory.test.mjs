/**
 * FIN-AUD-001 — Inventory tests.
 */
import assert from 'node:assert/strict';
import {
  FIN_CAPABILITY_INVENTORY,
  getInventoryEntry,
  listInventoryByMaturity,
  validateInventoryIntegrity
} from '../../platform/audit/finance/index.js';

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

console.log('FIN-AUD-001 — inventory.test\n');

test('inventory integrity', () => {
  const result = validateInventoryIntegrity();
  assert.equal(result.valid, true, result.issues.join('; '));
});

test('each entry has owner domain location maturity', () => {
  for (const e of FIN_CAPABILITY_INVENTORY) {
    assert.ok(e.owner, e.capabilityId);
    assert.ok(e.domain, e.capabilityId);
    assert.ok(e.location, e.capabilityId);
    assert.ok(e.maturity, e.capabilityId);
  }
});

test('complete capabilities include industrial cost and nexus billing', () => {
  const complete = listInventoryByMaturity('complete');
  assert.ok(complete.some((e) => e.capabilityId === 'industrial_cost_service'));
  assert.ok(complete.some((e) => e.capabilityId === 'nexus_billing_engine_v4'));
});

test('nexus billing reuse required', () => {
  const entry = getInventoryEntry('nexus_wallet_service');
  assert.equal(entry.reuse, 'required');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
