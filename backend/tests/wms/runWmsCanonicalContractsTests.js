'use strict';

const assert = require('assert');
const {
  withMeta,
  ENTITY_TYPES
} = require('../../src/domains/logistics-operational/compatibility/contracts/canonicalContracts');

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

console.log('WMS-003 — Canonical Contracts Tests\n');

test('ENTITY_TYPES SSOT (10 types)', () => {
  assert.strictEqual(ENTITY_TYPES.length, 10);
  assert.ok(ENTITY_TYPES.includes('ReceivingOrder'));
  assert.ok(ENTITY_TYPES.includes('TransferOrder'));
});

test('withMeta adds routing metadata', () => {
  const dto = withMeta({ id: '1', code: 'X' }, 'wms', 'wms');
  assert.strictEqual(dto._source, 'wms');
  assert.strictEqual(dto._routing, 'wms');
  assert.strictEqual(dto.code, 'X');
});

test('API response preserves canonical meta fields', () => {
  const entity = withMeta({ item_code: 'A' }, 'legacy', 'hybrid');
  assert.strictEqual(entity._source, 'legacy');
  assert.strictEqual(entity._routing, 'hybrid');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
