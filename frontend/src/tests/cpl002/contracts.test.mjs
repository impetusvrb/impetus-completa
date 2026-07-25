/**
 * CPL-002 — Contracts unchanged (CPL-001 interfaces only).
 */
import assert from 'node:assert/strict';
import {
  COGNITIVE_CONTRACT_DESCRIPTORS,
  COGNITIVE_CONTRACT_IDS,
  getCognitiveContract
} from '../../platform/cognitive/contracts/cognitiveContractDescriptors.js';

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

console.log('CPL-002 — contracts.test\n');

test('CPL-001 contracts preserved — interface only', () => {
  assert.ok(COGNITIVE_CONTRACT_IDS.length >= 8);
  for (const id of COGNITIVE_CONTRACT_IDS) {
    assert.equal(getCognitiveContract(id).status, 'interface_only', id);
  }
});

test('contracts reference existing implementations not platform engines', () => {
  const rec = getCognitiveContract('RecommendationProvider');
  assert.ok(rec.currentImplementations.some((p) => p.includes('clRecommendationEngine')));
  assert.ok(!rec.currentImplementations.some((p) => p.includes('platform/cognitive/recommendation')));
});

test('DecisionTraceProvider references domain paths', () => {
  const dt = getCognitiveContract('DecisionTraceProvider');
  assert.ok(dt.currentImplementations.some((p) => p.includes('clDecisionTrace')));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
