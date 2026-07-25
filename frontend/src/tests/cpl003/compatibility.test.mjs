/**
 * CPL-003 — Compatibility matrix tests.
 */
import assert from 'node:assert/strict';
import {
  CAPABILITY_COMPATIBILITY_MATRIX,
  getCompatibilityRow,
  listConsumers,
  listProviders,
  validateCompatibilityIntegrity
} from '../../platform/cognitive/governance/compatibility/index.js';

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

console.log('CPL-003 — compatibility.test\n');

test('compatibility matrix integrity', () => {
  const result = validateCompatibilityIntegrity();
  assert.equal(result.valid, true, result.issues.join('; '));
  assert.ok(CAPABILITY_COMPATIBILITY_MATRIX.length >= 10);
});

test('row has Capability Contract Provider Adapter Consumers', () => {
  const row = getCompatibilityRow('recommendation_engine');
  assert.equal(row.contractId, 'RecommendationProvider');
  assert.ok(row.provider.includes('clRecommendationEngine'));
  assert.equal(row.adapterId, 'logistics_adapter');
  assert.ok(row.consumers.length >= 1);
});

test('listConsumers and listProviders', () => {
  assert.ok(listConsumers('unified_timeline').length >= 1);
  const providers = listProviders('decision_trace');
  assert.ok(providers.some((p) => p.role === 'canonical'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
