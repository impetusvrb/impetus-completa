'use strict';

const assert = require('assert');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { MSA_PILOT_BLOCK_IDS } = require('../../src/cognitiveRuntime/registry/msaCognitiveBlockPack');
const { loadMsaTenantSignals } = require('../../src/cognitiveRuntime/domains/msa/bridge/msaTenantSignalLoader');
const { attachMsaRuntimeFoundation } = require('../../src/cognitiveRuntime/domains/msa/runtime/msaFoundationAttachment');
const { applyMsaControlledRenderPromotion } = require('../../src/cognitiveRuntime/renderPromotion/msa/msaControlledRenderRuntime');
const { applyMsaCockpitConsolidation } = require('../../src/cognitiveRuntime/domains/msa/runtime/msaCockpitConsolidationRuntime');
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
  console.log('GF-008 — MSA Runtime Foundation Tests\n');

  test('MSA_PILOT_BLOCK_IDS has 12 blocks', () => {
    assert.strictEqual(MSA_PILOT_BLOCK_IDS.length, 12);
  });

  test('msa blocks registered in cognitiveBlockRegistry', () => {
    const stats = registry.getRegistryStats();
    assert.strictEqual(stats.msa_pilot_blocks, 12);
    assert.ok(registry.getBlockById('msa.measurement_system_registry'));
    assert.ok(registry.getBlockById('msa.variable_grr'));
  });

  test('msa domain in cognitiveDomainRegistry', () => {
    const def = domainRegistry.getDomainDefinition('msa');
    assert.ok(def);
    assert.strictEqual(def.runtime_id, 'msa_native');
    assert.strictEqual(def.cockpit_ready, false);
    assert.strictEqual(def.maturity, 'foundation');
  });

  await testAsync('MsaTenantSignalLoader real loader NO_DATASET without company', async () => {
    const sig = await loadMsaTenantSignals({}, {});
    assert.strictEqual(sig.signal_readiness, 'NO_DATASET');
    assert.strictEqual(sig.foundation_only, false);
    assert.ok(!sig.mock_signals);
  });

  await testAsync('attachMsaRuntimeFoundation adds inactive runtime + real signal loader', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001' };
    const { payload } = await attachMsaRuntimeFoundation(user, {});
    assert.strictEqual(payload.msa_cognitive_runtime.runtime_id, 'msa_native');
    assert.strictEqual(payload.msa_cognitive_runtime.consolidation_applied, false);
    assert.strictEqual(payload.msa_cognitive_runtime.promotion_applied, false);
    assert.strictEqual(payload.msa_cognitive_runtime.inactive, true);
    assert.strictEqual(payload.msa_cognitive_runtime.cockpit_mode, 'off');
    assert.deepStrictEqual(payload.msa_cognitive_centers, []);
    assert.ok(payload.msa_signal_loader);
    assert.strictEqual(payload.msa_signal_loader.inactive, true);
    assert.strictEqual(payload.msa_signal_loader.pilot_blocks.length, 12);
    assert.ok('binding_ratio' in payload.msa_signal_loader);
    assert.ok('signal_readiness' in payload.msa_signal_loader);
    assert.ok(payload.msa_cognitive_runtime.pilot_blocks.length === 12);
  });

  test('applyMsaControlledRenderPromotion blocks when binding_ratio=0', () => {
    const prev = process.env.IMPETUS_MSA_RENDER_PROMOTION;
    process.env.IMPETUS_MSA_RENDER_PROMOTION = 'controlled';
    try {
      const out = applyMsaControlledRenderPromotion(
        {},
        { profile_code: 'manager_quality', functional_area: 'quality' },
        {},
        { engine_bridge: { binding_ratio: 0, bound_blocks: [], missing_blocks: [] }, shadow_cognitive_cockpit: { blocks: [] } }
      );
      assert.strictEqual(out.cognitive_render_promotion.promotion_applied, false);
      assert.strictEqual(out.skipped, true);
    } finally {
      if (prev == null) delete process.env.IMPETUS_MSA_RENDER_PROMOTION;
      else process.env.IMPETUS_MSA_RENDER_PROMOTION = prev;
    }
  });

  test('applyMsaControlledRenderPromotion allows when gate passes (passive binding)', () => {
    const prev = process.env.IMPETUS_MSA_RENDER_PROMOTION;
    process.env.IMPETUS_MSA_RENDER_PROMOTION = 'controlled';
    try {
      const out = applyMsaControlledRenderPromotion(
        {},
        { profile_code: 'manager_quality', functional_area: 'quality' },
        {},
        {
          engine_bridge: { binding_ratio: 0.6, bound_blocks: ['msa.measurement_system_registry'], missing_blocks: [] },
          shadow_cognitive_cockpit: {
            blocks: [{ block_id: 'msa.measurement_system_registry', eligible: true, shadow_signals: { binding_ok: true } }]
          }
        }
      );
      assert.strictEqual(out.cognitive_render_promotion.promotion_applied, true);
      assert.strictEqual(out.cognitive_render_promotion.binding_ratio, 0.6);
    } finally {
      if (prev == null) delete process.env.IMPETUS_MSA_RENDER_PROMOTION;
      else process.env.IMPETUS_MSA_RENDER_PROMOTION = prev;
    }
  });

  await testAsync('applyMsaCockpitConsolidation structural inactive', async () => {
    const out = await applyMsaCockpitConsolidation({}, {}, {}, {});
    assert.strictEqual(out.msa_cognitive_runtime.consolidation_applied, false);
    assert.strictEqual(out.msa_cognitive_runtime.inactive, true);
    assert.strictEqual(out.skipped, true);
  });

  await testAsync('/dashboard/me cognitive facade attaches msa foundation', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.ok(result.payload.msa_cognitive_runtime);
    assert.strictEqual(result.payload.msa_cognitive_runtime.runtime_id, 'msa_native');
    assert.strictEqual(result.payload.msa_cognitive_runtime.consolidation_applied, false);
    assert.strictEqual(result.payload.msa_cognitive_runtime.inactive, true);
    assert.ok(result.payload.msa_signal_loader);
    assert.deepStrictEqual(result.payload.msa_cognitive_centers, []);
    assert.ok(result.cognitive_runtime_report.msa_runtime_foundation?.registered);
  });

  await testAsync('quality + ppap payloads preserved with msa foundation', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.ok(result.payload.specialized_cockpit_runtime || result.payload.quality_cognitive_centers !== undefined);
    assert.ok(result.payload.ppap_cognitive_runtime);
    assert.ok(result.payload.msa_cognitive_runtime);
    assert.strictEqual(result.payload.msa_cognitive_runtime.inactive, true);
    assert.strictEqual(result.payload.ppap_cognitive_runtime.inactive, true);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
