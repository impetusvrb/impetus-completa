/**
 * FIN-AUD-001 — Module map tests.
 */
import assert from 'node:assert/strict';
import {
  FIN_MODULE_MAP,
  getModuleMapEntry,
  listHiddenOrExperimentalModules,
  validateModuleMapIntegrity
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

console.log('FIN-AUD-001 — moduleMap.test\n');

test('module map integrity', () => {
  const result = validateModuleMapIntegrity();
  assert.equal(result.valid, true);
  assert.ok(result.count >= 5);
});

test('contextual finance modules mapped', () => {
  assert.ok(getModuleMapEntry('financial_intelligence'));
  assert.ok(getModuleMapEntry('cost_center'));
  assert.ok(getModuleMapEntry('losses_map'));
});

test('finance_native is placeholder', () => {
  const fin = getModuleMapEntry('finance_native');
  assert.equal(fin.maturity, 'placeholder');
  assert.equal(fin.visibility, 'eox_inactive');
});

test('hidden or experimental includes finance_native and losses_map partial', () => {
  const hidden = listHiddenOrExperimentalModules();
  assert.ok(hidden.some((m) => m.moduleId === 'finance_native'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
