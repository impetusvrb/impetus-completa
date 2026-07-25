/**
 * CPL-002 — Adapter health monitor tests.
 */
import assert from 'node:assert/strict';
import {
  probeAdapterHealth,
  monitorAllAdapters,
  COGNITIVE_HEALTH_STATES
} from '../../platform/cognitive/health/cognitiveHealthMonitor.js';
import {
  bootstrapCognitivePlatformAdapters,
  resetBootstrapForTests
} from '../../platform/cognitive/index.js';
import { clearAdapterStoreForTests } from '../../platform/cognitive/runtime/cognitiveAdapterRuntime.js';
import { logisticsCognitiveAdapter } from '../../platform/cognitive/adapters/logistics/logisticsCognitiveAdapter.js';

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

console.log('CPL-002 — adapterHealth.test\n');

test('health states defined', () => {
  assert.ok(COGNITIVE_HEALTH_STATES.includes('available'));
  assert.ok(COGNITIVE_HEALTH_STATES.includes('degraded'));
  assert.ok(COGNITIVE_HEALTH_STATES.includes('offline'));
});

test('probeAdapterHealth returns available for logistics', () => {
  const h = probeAdapterHealth(logisticsCognitiveAdapter);
  assert.equal(h.status, 'available');
  assert.equal(h.adapterId, 'logistics_adapter');
  assert.ok(h.capabilities >= 1);
});

test('monitorAllAdapters aggregates after bootstrap', () => {
  clearAdapterStoreForTests();
  resetBootstrapForTests();
  bootstrapCognitivePlatformAdapters();
  const monitor = monitorAllAdapters();
  assert.equal(monitor.summary.total, 4);
  assert.ok(monitor.summary.available >= 4);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
