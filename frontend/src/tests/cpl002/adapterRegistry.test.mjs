/**
 * CPL-002 — Adapter registry tests.
 */
import assert from 'node:assert/strict';
import {
  COGNITIVE_ADAPTER_REGISTRY,
  COGNITIVE_PLATFORM_REGISTRY,
  validateCpl002RegistryIntegrity,
  getCognitiveAdapterRegistryEntry
} from '../../platform/cognitive/index.js';

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

console.log('CPL-002 — adapterRegistry.test\n');

test('four adapters active in CPL-002', () => {
  const active = COGNITIVE_ADAPTER_REGISTRY.filter((a) => a.status === 'active');
  assert.equal(active.length, 4);
  for (const id of ['logistics_adapter', 'quality_adapter', 'safety_adapter', 'environment_adapter']) {
    const a = getCognitiveAdapterRegistryEntry(id);
    assert.ok(a, id);
    assert.equal(a.status, 'active');
    assert.ok(a.runtimePath);
    assert.ok(a.version);
  }
});

test('logistics capabilities linked to active adapter', () => {
  const linked = COGNITIVE_PLATFORM_REGISTRY.filter((c) => c.adapterId === 'logistics_adapter');
  assert.ok(linked.length >= 2);
  for (const c of linked) assert.equal(c.adapterStatus, 'active');
});

test('CPL-002 registry integrity validation', () => {
  const result = validateCpl002RegistryIntegrity();
  assert.equal(result.valid, true, result.issues.join('; '));
  assert.ok(result.activeAdapters >= 4);
});

test('maintenance and PPAP adapters remain planned', () => {
  const maint = getCognitiveAdapterRegistryEntry('maintenance_adapter');
  const ppap = getCognitiveAdapterRegistryEntry('ppap_adapter');
  assert.equal(maint.status, 'planned');
  assert.equal(ppap.status, 'planned');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
