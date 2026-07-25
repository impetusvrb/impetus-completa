/**
 * CPL-003 — Lifecycle tests.
 */
import assert from 'node:assert/strict';
import {
  CAPABILITY_LIFECYCLE_STATES,
  CAPABILITY_LIFECYCLE,
  getCapabilityLifecycle,
  listCapabilitiesByLifecycleStatus,
  validateLifecycleIntegrity
} from '../../platform/cognitive/governance/lifecycle/index.js';

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

console.log('CPL-003 — lifecycle.test\n');

test('lifecycle states defined', () => {
  for (const s of ['planned', 'experimental', 'active', 'deprecated', 'retired']) {
    assert.ok(CAPABILITY_LIFECYCLE_STATES.includes(s), s);
  }
});

test('every registry capability has lifecycle metadata', () => {
  const result = validateLifecycleIntegrity();
  assert.equal(result.valid, true, result.issues.join('; '));
  assert.ok(result.count >= 10);
});

test('active adapters map to active lifecycle', () => {
  const rec = getCapabilityLifecycle('recommendation_engine');
  assert.equal(rec.status, 'active');
});

test('list by lifecycle status works', () => {
  const active = listCapabilitiesByLifecycleStatus('active');
  assert.ok(active.length >= 1);
  assert.ok(Object.keys(CAPABILITY_LIFECYCLE).length >= active.length);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
