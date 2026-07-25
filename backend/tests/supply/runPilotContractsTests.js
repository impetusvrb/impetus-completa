'use strict';

const assert = require('assert');
const {
  PILOT_CONTRACT_VERSION,
  WMS_COMPATIBLE_VERSION,
  WMS_CANONICAL_ENTITY_TYPES,
  SUPPLY_PILOT_BRIDGE_ENDPOINTS,
  CONTRACT_EVOLUTION
} = require('../../src/domains/supply/pilot/supplyPilotContracts');
const { snapshotPilotCompatibility } = require('../../src/domains/supply/pilot/supplyPilotRegistry');

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

console.log('GF-026 — Pilot Contracts Tests\n');

test('version SSOT', () => {
  assert.strictEqual(PILOT_CONTRACT_VERSION, '0.3.0');
  assert.strictEqual(WMS_COMPATIBLE_VERSION, '0.3.0');
});

test('WMS entity types (10)', () => {
  assert.strictEqual(WMS_CANONICAL_ENTITY_TYPES.length, 10);
});

test('bridge endpoints have producer/consumer', () => {
  for (const ep of Object.values(SUPPLY_PILOT_BRIDGE_ENDPOINTS)) {
    assert.strictEqual(ep.producer, 'WMS_PUBLIC_API');
    assert.strictEqual(ep.consumer, 'SUPPLY_PILOT');
    assert.ok(ep.path.startsWith('/v1/'));
  }
});

test('compatibility snapshot', () => {
  const c = snapshotPilotCompatibility();
  assert.strictEqual(c.compatible, true);
  assert.strictEqual(c.wms_api_phase, 'WMS-003');
});

test('evolution strategy documented', () => {
  assert.ok(CONTRACT_EVOLUTION.strategy);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
