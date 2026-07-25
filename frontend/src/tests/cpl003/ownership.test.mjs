/**
 * CPL-003 — Ownership tests.
 */
import assert from 'node:assert/strict';
import {
  CAPABILITY_OWNERSHIP,
  DOMAIN_OWNERSHIP_TEAMS,
  getCapabilityOwnership,
  listOwnershipByDomain,
  validateOwnershipIntegrity
} from '../../platform/cognitive/governance/ownership/index.js';

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

console.log('CPL-003 — ownership.test\n');

test('domain ownership teams defined', () => {
  assert.ok(DOMAIN_OWNERSHIP_TEAMS.logistics_wms);
  assert.ok(DOMAIN_OWNERSHIP_TEAMS.quality);
  assert.ok(DOMAIN_OWNERSHIP_TEAMS.command_center);
});

test('ownership integrity matches registry', () => {
  const result = validateOwnershipIntegrity();
  assert.equal(result.valid, true, result.issues.join('; '));
});

test('ownership chain includes owner adapter contract version', () => {
  const own = getCapabilityOwnership('recommendation_engine');
  assert.equal(own.ownerDomain, 'logistics_wms');
  assert.equal(own.adapterId, 'logistics_adapter');
  assert.equal(own.contractId, 'RecommendationProvider');
  assert.ok(own.version);
  assert.ok(own.team);
});

test('listOwnershipByDomain filters logistics', () => {
  const rows = listOwnershipByDomain('logistics_wms');
  assert.ok(rows.length >= 5);
  assert.ok(Object.keys(CAPABILITY_OWNERSHIP).length >= rows.length);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
