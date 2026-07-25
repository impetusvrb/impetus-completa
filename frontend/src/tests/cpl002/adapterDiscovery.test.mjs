/**
 * CPL-002 — Discovery API tests.
 */
import assert from 'node:assert/strict';
import {
  listCapabilities,
  getCapability,
  listAdapters,
  getProvider,
  getHealth,
  delegateToAdapter,
  bootstrapCognitivePlatformAdapters,
  resetBootstrapForTests
} from '../../platform/cognitive/index.js';
import { clearAdapterStoreForTests } from '../../platform/cognitive/runtime/cognitiveAdapterRuntime.js';

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

console.log('CPL-002 — adapterDiscovery.test\n');

test('listCapabilities returns registry entries', () => {
  const caps = listCapabilities();
  assert.ok(caps.length >= 10);
  assert.ok(caps.some((c) => c.capabilityId === 'recommendation_engine'));
});

test('getCapability includes contract reference', () => {
  const cap = getCapability('recommendation_engine');
  assert.ok(cap);
  assert.equal(cap.contract.contractId, 'RecommendationProvider');
});

test('listAdapters shows runtime and registry', () => {
  clearAdapterStoreForTests();
  resetBootstrapForTests();
  bootstrapCognitivePlatformAdapters();
  const { runtime, registry } = listAdapters();
  assert.equal(runtime.length, 4);
  assert.ok(registry.some((a) => a.adapterId === 'logistics_adapter' && a.registered));
});

test('getProvider returns domain implementation paths', () => {
  const p = getProvider('decision_trace');
  assert.ok(p.canonicalImplementation.includes('clDecisionTrace'));
});

test('getHealth returns monitor summary', () => {
  clearAdapterStoreForTests();
  resetBootstrapForTests();
  bootstrapCognitivePlatformAdapters();
  const h = getHealth();
  assert.ok(h.summary);
  assert.equal(h.summary.total, 4);
});

test('delegateToAdapter executes logistics insights without new engine', () => {
  clearAdapterStoreForTests();
  resetBootstrapForTests();
  bootstrapCognitivePlatformAdapters();
  const res = delegateToAdapter('safety_adapter', 'pressure_analysis', { input: { menu_extra_count: 2, view_count: 3 } });
  assert.equal(res.ok, true);
  assert.ok(res.result.cognitive_risk_score != null);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
