'use strict';

const assert = require('assert');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { LOGISTICS_PILOT_BLOCK_IDS } = require('../../src/cognitiveRuntime/registry/logisticsCognitiveBlockPack');
const { loadLogisticsTenantSignals } = require('../../src/cognitiveRuntime/domains/logistics/bridge/logisticsTenantSignalLoader');
const { attachLogisticsRuntimeFoundation } = require('../../src/cognitiveRuntime/domains/logistics/runtime/logisticsFoundationAttachment');
const { consolidateLogisticsCockpit } = require('../../src/cognitiveRuntime/domains/logistics/cockpit/logisticsCockpitConsolidator');
const registry = require('../../src/cognitiveRuntime/registry/cognitiveBlockRegistry');
const domainRegistry = require('../../src/cognitiveRuntime/domainFoundation/registry/cognitiveDomainRegistry');

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

async function testAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

(async () => {
  console.log('INC-038 — Logistics Runtime Foundation Tests\n');

  test('LOGISTICS_PILOT_BLOCK_IDS has 13 blocks', () => {
    assert.strictEqual(LOGISTICS_PILOT_BLOCK_IDS.length, 13);
  });

  test('logistics blocks registered in cognitiveBlockRegistry', () => {
    const stats = registry.getRegistryStats();
    assert.strictEqual(stats.logistics_pilot_blocks, 13);
    assert.ok(registry.getBlockById('logistics.inventory_health'));
    assert.ok(registry.getBlockById('logistics.shipment_otif'));
  });

  test('logistics domain in cognitiveDomainRegistry', () => {
    const def = domainRegistry.getDomainDefinition('logistics');
    assert.ok(def);
    assert.strictEqual(def.runtime_id, 'logistics_native');
    assert.strictEqual(def.cockpit_ready, false);
    assert.strictEqual(def.maturity, 'foundation');
  });

  await testAsync('LogisticsTenantSignalLoader real datasets (INC-039)', async () => {
    const sig = await loadLogisticsTenantSignals({ company_id: '00000000-0000-4000-8000-000000000001' }, {});
    assert.strictEqual(sig.ok, true);
    assert.strictEqual(sig.foundation_only, false);
    assert.ok(['empty', 'partial', 'ready'].includes(sig.signal_readiness));
    assert.ok(sig.datasets && typeof sig.datasets === 'object');
    assert.ok(Array.isArray(sig.data_sources));
    assert.ok(!sig.mock_signals);
  });

  await testAsync('attachLogisticsRuntimeFoundation adds inactive runtime + signal loader', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001' };
    const { payload } = await attachLogisticsRuntimeFoundation(user, {});
    assert.strictEqual(payload.logistics_cognitive_runtime.runtime_id, 'logistics_native');
    assert.strictEqual(payload.logistics_cognitive_runtime.consolidation_applied, false);
    assert.strictEqual(payload.logistics_cognitive_runtime.promotion_applied, false);
    assert.strictEqual(payload.logistics_cognitive_runtime.inactive, true);
    assert.deepStrictEqual(payload.logistics_cognitive_centers, []);
    assert.ok(payload.logistics_signal_loader);
    assert.strictEqual(typeof payload.logistics_signal_loader.binding_ratio, 'number');
    assert.strictEqual(payload.logistics_signal_loader.pilot_blocks.length, 13);
  });

  await testAsync('consolidator registers 8 centers when promoted', async () => {
    const out = await consolidateLogisticsCockpit(
      {},
      { cognitive_render_promotion: { promotion_applied: true } },
      {},
      { shadow_cognitive_cockpit: { blocks: [] }, engine_bridge: { binding_ratio: 0.385, bound_blocks: [] } }
    );
    assert.strictEqual(out.consolidation_applied, true);
    assert.strictEqual(out.cockpit_mode, 'logistics_native');
    assert.ok(Array.isArray(out.centers));
    assert.strictEqual(out.centers.length, 8);
  });

  await testAsync('/dashboard/me cognitive facade attaches logistics foundation', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_logistics', functional_area: 'logistics' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.ok(result.payload.logistics_cognitive_runtime);
    assert.strictEqual(result.payload.logistics_cognitive_runtime.runtime_name, 'logistics_native');
    assert.strictEqual(result.payload.logistics_cognitive_runtime.consolidation_applied, false);
    assert.ok(result.payload.logistics_signal_loader);
    assert.ok(result.cognitive_runtime_report.logistics_runtime_foundation?.registered);
  });

  await testAsync('quality profile still resolves alongside logistics foundation', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001', role: 'gerente', hierarchy_level: 2 };
    const payload = {
      profile_code: 'manager_quality',
      functional_area: 'quality',
      specialized_cockpit_runtime: { consolidation_applied: false, cockpit_mode: 'off' }
    };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.ok(result.payload.logistics_cognitive_runtime);
    assert.strictEqual(result.payload.profile_code, 'manager_quality');
    assert.ok(result.payload.logistics_cognitive_runtime.inactive === true);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
