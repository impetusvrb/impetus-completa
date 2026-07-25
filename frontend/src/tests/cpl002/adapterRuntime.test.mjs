/**
 * CPL-002 — Adapter runtime tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createCognitiveAdapter,
  registerCognitiveAdapter,
  getCognitiveAdapter,
  orchestrate,
  clearAdapterStoreForTests,
  COGNITIVE_ADAPTER_OPERATIONS
} from '../../platform/cognitive/runtime/cognitiveAdapterRuntime.js';
import { logisticsCognitiveAdapter } from '../../platform/cognitive/adapters/logistics/logisticsCognitiveAdapter.js';
import { bootstrapCognitivePlatformAdapters, resetBootstrapForTests } from '../../platform/cognitive/runtime/cognitivePlatformBootstrap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const PLATFORM = path.join(FE, 'src/platform/cognitive');

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

console.log('CPL-002 — adapterRuntime.test\n');

test('adapter runtime module exists', () => {
  assert.ok(fs.existsSync(path.join(PLATFORM, 'runtime/cognitiveAdapterRuntime.js')));
});

test('CognitiveAdapter operations defined', () => {
  assert.ok(COGNITIVE_ADAPTER_OPERATIONS.includes('execute'));
  assert.ok(COGNITIVE_ADAPTER_OPERATIONS.includes('health'));
});

test('createCognitiveAdapter is thin — no business logic', () => {
  const adapter = createCognitiveAdapter({
    id: 'test_adapter',
    domain: 'test',
    capabilities: ['echo'],
    providerPaths: ['domains/test/provider.js'],
    handlers: {
      echo(ctx) {
        return { echoed: ctx.value };
      }
    },
    healthProbe: () => ({ status: 'available', adapterId: 'test_adapter' })
  });
  assert.equal(adapter.id, 'test_adapter');
  const res = adapter.execute('echo', { value: 42 });
  assert.equal(res.ok, true);
  assert.equal(res.delegated, true);
  assert.equal(res.result.echoed, 42);
});

test('logistics adapter delegates to OPM-007/008 utils', () => {
  const snap = {
    warehouses: [{ id: 'w1' }],
    balances: [],
    movements: [],
    receiving: [{ status: 'open', metadata: {} }],
    picking: [],
    shipping: [],
    transfers: [],
    capacities: [{ warehouse_id: 'w1', total_capacity: 100, used_capacity: 90 }]
  };
  const insights = logisticsCognitiveAdapter.execute('insights', { snapshot: snap });
  assert.equal(insights.ok, true);
  assert.equal(insights.delegated, true);
  assert.ok(Array.isArray(insights.result));

  const sim = logisticsCognitiveAdapter.simulate('rcv_volume_up_20', { snapshot: snap });
  assert.equal(sim.ok, true);
  assert.equal(sim.result.sideEffects, false);
});

test('bootstrap registers four domain adapters', () => {
  clearAdapterStoreForTests();
  resetBootstrapForTests();
  const adapters = bootstrapCognitivePlatformAdapters();
  assert.equal(adapters.length, 4);
  assert.ok(getCognitiveAdapter('logistics_adapter'));
  assert.ok(getCognitiveAdapter('quality_adapter'));
  assert.ok(getCognitiveAdapter('safety_adapter'));
  assert.ok(getCognitiveAdapter('environment_adapter'));
});

test('orchestrate routes to registered adapter', () => {
  clearAdapterStoreForTests();
  resetBootstrapForTests();
  bootstrapCognitivePlatformAdapters();
  const res = orchestrate('quality_adapter', 'capabilities', {});
  assert.equal(res.ok, true);
  assert.ok(res.result.includes('insights'));
});

test('forbidden engine directories absent', () => {
  for (const d of ['decision', 'recommendation', 'rules', 'simulation', 'timeline', 'risk', 'analytics', 'ai']) {
    assert.ok(!fs.existsSync(path.join(PLATFORM, d)), d);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
