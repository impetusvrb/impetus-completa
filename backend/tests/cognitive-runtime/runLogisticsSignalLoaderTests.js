'use strict';

const assert = require('assert');
const { loadLogisticsTenantSignals } = require('../../src/cognitiveRuntime/domains/logistics/bridge/logisticsTenantSignalLoader');
const { runLogisticsSignalBinding } = require('../../src/cognitiveRuntime/domains/logistics/bridge/logisticsSignalBindingRuntime');
const { invokeLogisticsBlockBridge } = require('../../src/cognitiveRuntime/domains/logistics/bridge/logisticsBlockBridge');
const { buildBindingValidationReport } = require('../../src/cognitiveRuntime/observability/bindingValidationReport');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { LOGISTICS_PILOT_BLOCK_IDS } = require('../../src/cognitiveRuntime/registry/logisticsCognitiveBlockPack');

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
  console.log('INC-039/040 — Logistics Signal Loader Tests\n');
  process.env.IMPETUS_LOGISTICS_SIGNAL_DIAGNOSTICS = 'off';

  test('13 pilot blocks defined', () => {
    assert.strictEqual(LOGISTICS_PILOT_BLOCK_IDS.length, 13);
  });

  await testAsync('loader returns real structure without mock', async () => {
    const sig = await loadLogisticsTenantSignals(
      { company_id: '00000000-0000-4000-8000-000000000001' },
      {}
    );
    assert.strictEqual(sig.foundation_only, false);
    assert.ok(sig.datasets);
    assert.ok('warehouse_materials' in sig.datasets);
    assert.ok(Array.isArray(sig.data_sources));
    assert.notStrictEqual(sig.signal_readiness, 'foundation_stub');
  });

  await testAsync('picking block fail-closed NOT_IMPLEMENTED', async () => {
    const sig = await loadLogisticsTenantSignals(
      { company_id: '00000000-0000-4000-8000-000000000001' },
      {}
    );
    const b = invokeLogisticsBlockBridge('logistics.picking_efficiency', sig, {});
    assert.strictEqual(b.reason, 'NOT_IMPLEMENTED');
    assert.strictEqual(b.binding_ok, false);
    assert.strictEqual(b.engine_ok, false);
  });

  await testAsync('binding uses Quality binding_ratio algorithm', async () => {
    const binding = await runLogisticsSignalBinding(
      { company_id: '00000000-0000-4000-8000-000000000001' },
      {}
    );
    assert.ok(binding.binding_validation);
    const manual = buildBindingValidationReport(binding.enriched_blocks, binding.signal_bundle);
    assert.strictEqual(binding.binding_ratio, manual.binding_ratio);
    assert.strictEqual(binding.pilot_blocks.length, 13);
    assert.ok(Array.isArray(binding.bound_blocks));
    assert.ok(Array.isArray(binding.missing_blocks));
    for (const d of binding.block_details) {
      assert.ok('engine_ok' in d && 'binding_ok' in d && 'reason' in d);
    }
  });

  await testAsync('payload includes signal_loader without promotion', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_logistics', functional_area: 'logistics' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.ok(result.payload.logistics_signal_loader);
    assert.strictEqual(result.payload.logistics_cognitive_runtime.consolidation_applied, false);
    assert.strictEqual(result.payload.logistics_cognitive_runtime.inactive, true);
    assert.ok('binding_ratio' in result.payload.logistics_signal_loader);
    assert.strictEqual(result.payload.logistics_signal_loader.pilot_blocks.length, 13);
    assert.ok(result.cognitive_runtime_report.logistics_signal_loader);
  });

  await testAsync('no synthetic binding when tenant empty', async () => {
    const binding = await runLogisticsSignalBinding(
      { company_id: '00000000-0000-4000-8000-000000000099' },
      {}
    );
    assert.ok(binding.binding_ratio >= 0 && binding.binding_ratio <= 1);
    const picking = binding.block_details.find((b) => b.block_id === 'logistics.picking_efficiency');
    assert.strictEqual(picking.reason, 'NOT_IMPLEMENTED');
  });

  await testAsync('INC-040 cross-domain reconciliation elevates binding on real tenant', async () => {
    const binding = await runLogisticsSignalBinding(
      { company_id: '511f4819-fc48-479e-b11e-49ba4fb9c81b' },
      {}
    );
    assert.ok(binding.binding_ratio >= 0.35, `expected binding_ratio >= 0.35, got ${binding.binding_ratio}`);
    assert.ok(binding.bound_blocks.includes('logistics.inventory_health'));
    assert.ok(binding.bound_blocks.includes('logistics.receiving_flow'));
    assert.ok(binding.bound_blocks.includes('logistics.traceability_bridge'));
    assert.ok(binding.bound_blocks.includes('logistics.contextual_logistics_ai'));
    assert.strictEqual(
      binding.block_details.find((b) => b.block_id === 'logistics.picking_efficiency')?.reason,
      'NOT_IMPLEMENTED'
    );
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
