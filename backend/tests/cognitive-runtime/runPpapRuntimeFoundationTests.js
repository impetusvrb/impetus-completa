'use strict';

const assert = require('assert');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { PPAP_PILOT_BLOCK_IDS } = require('../../src/cognitiveRuntime/registry/ppapCognitiveBlockPack');
const { loadPpapTenantSignals } = require('../../src/cognitiveRuntime/domains/ppap/bridge/ppapTenantSignalLoader');
const { attachPpapRuntimeFoundation } = require('../../src/cognitiveRuntime/domains/ppap/runtime/ppapFoundationAttachment');
const { applyPpapControlledRenderPromotion } = require('../../src/cognitiveRuntime/renderPromotion/ppap/ppapControlledRenderRuntime');
const { applyPpapCockpitConsolidation } = require('../../src/cognitiveRuntime/domains/ppap/runtime/ppapCockpitConsolidationRuntime');
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
  console.log('GF-001 — PPAP Runtime Foundation Tests\n');

  test('PPAP_PILOT_BLOCK_IDS has 12 blocks', () => {
    assert.strictEqual(PPAP_PILOT_BLOCK_IDS.length, 12);
  });

  test('ppap blocks registered in cognitiveBlockRegistry', () => {
    const stats = registry.getRegistryStats();
    assert.strictEqual(stats.ppap_pilot_blocks, 12);
    assert.ok(registry.getBlockById('ppap.submission_management'));
    assert.ok(registry.getBlockById('ppap.document_package'));
  });

  test('ppap domain in cognitiveDomainRegistry', () => {
    const def = domainRegistry.getDomainDefinition('ppap');
    assert.ok(def);
    assert.strictEqual(def.runtime_id, 'ppap_native');
    assert.strictEqual(def.cockpit_ready, false);
    assert.strictEqual(def.maturity, 'foundation');
  });

  await testAsync('PpapTenantSignalLoader real loader NO_DATASET without company', async () => {
    const sig = await loadPpapTenantSignals({}, {});
    assert.strictEqual(sig.signal_readiness, 'NO_DATASET');
    assert.strictEqual(sig.foundation_only, false);
    assert.ok(!sig.mock_signals);
  });

  await testAsync('attachPpapRuntimeFoundation adds inactive runtime + real signal loader', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001' };
    const { payload } = await attachPpapRuntimeFoundation(user, {});
    assert.strictEqual(payload.ppap_cognitive_runtime.runtime_id, 'ppap_native');
    assert.strictEqual(payload.ppap_cognitive_runtime.consolidation_applied, false);
    assert.strictEqual(payload.ppap_cognitive_runtime.promotion_applied, false);
    assert.strictEqual(payload.ppap_cognitive_runtime.inactive, true);
    assert.strictEqual(payload.ppap_cognitive_runtime.cockpit_mode, 'off');
    assert.deepStrictEqual(payload.ppap_cognitive_centers, []);
    assert.ok(payload.ppap_signal_loader);
    assert.strictEqual(payload.ppap_signal_loader.inactive, true);
    assert.strictEqual(payload.ppap_signal_loader.pilot_blocks.length, 12);
    assert.ok('binding_ratio' in payload.ppap_signal_loader);
    assert.ok('signal_readiness' in payload.ppap_signal_loader);
  });

  test('applyPpapControlledRenderPromotion gate blocks when binding 0', () => {
    const prev = process.env.IMPETUS_PPAP_RENDER_PROMOTION;
    process.env.IMPETUS_PPAP_RENDER_PROMOTION = 'controlled';
    try {
      const out = applyPpapControlledRenderPromotion(
        {},
        { profile_code: 'manager_quality', functional_area: 'quality' },
        {},
        { engine_bridge: { binding_ratio: 0, bound_blocks: [], missing_blocks: [] }, shadow_cognitive_cockpit: { blocks: [] } }
      );
      assert.strictEqual(out.cognitive_render_promotion.promotion_applied, false);
      assert.strictEqual(out.cognitive_render_promotion.gate_scenario, 'A_NO_DATASET');
      assert.strictEqual(out.skipped, true);
    } finally {
      if (prev == null) delete process.env.IMPETUS_PPAP_RENDER_PROMOTION;
      else process.env.IMPETUS_PPAP_RENDER_PROMOTION = prev;
    }
  });

  await testAsync('applyPpapCockpitConsolidation structural inactive', async () => {
    const out = await applyPpapCockpitConsolidation({}, {}, {}, {});
    assert.strictEqual(out.ppap_cognitive_runtime.consolidation_applied, false);
    assert.strictEqual(out.ppap_cognitive_runtime.inactive, true);
    assert.strictEqual(out.skipped, true);
  });

  await testAsync('/dashboard/me cognitive facade attaches ppap foundation', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.ok(result.payload.ppap_cognitive_runtime);
    assert.strictEqual(result.payload.ppap_cognitive_runtime.runtime_name, 'ppap_native');
    assert.strictEqual(result.payload.ppap_cognitive_runtime.consolidation_applied, false);
    assert.ok(result.payload.ppap_signal_loader);
    assert.ok(result.cognitive_runtime_report.ppap_runtime_foundation?.registered);
  });

  await testAsync('quality + logistics payloads preserved with ppap foundation', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_logistics', functional_area: 'logistics' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.ok(result.payload.logistics_cognitive_runtime);
    assert.ok(result.payload.ppap_cognitive_runtime);
    assert.strictEqual(result.payload.ppap_cognitive_runtime.inactive, true);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
