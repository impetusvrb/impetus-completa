'use strict';

const assert = require('assert');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { applyMsaControlledRenderPromotion } = require('../../src/cognitiveRuntime/renderPromotion/msa/msaControlledRenderRuntime');
const { applyMsaCockpitConsolidation } = require('../../src/cognitiveRuntime/domains/msa/runtime/msaCockpitConsolidationRuntime');
const { MSA_HUB_MOUNT_REGISTRY } = require('../../src/cognitiveRuntime/domains/msa/cockpit/msaCenters');
const { evaluateMsaConsolidationEligibility } = require('../../src/cognitiveRuntime/domains/msa/cockpit/msaConsolidationSupervisor');
const { evaluateMsaRenderPromotionEligibility } = require('../../src/cognitiveRuntime/renderPromotion/msa/msaRenderPromotionSupervisor');
const { runMsaSignalBinding } = require('../../src/cognitiveRuntime/domains/msa/bridge/msaSignalBindingRuntime');

const EMPTY_TENANT = '511f4819-fc48-479e-b11e-49ba4fb9c81b';

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
  console.log('GF-011 — MSA Promotion Chain Tests\n');

  test('hub mount registry has 6 canonical hubs', () => {
    assert.strictEqual(Object.keys(MSA_HUB_MOUNT_REGISTRY).length, 6);
    assert.ok(MSA_HUB_MOUNT_REGISTRY.study_governance === 'StudyGovernanceHub');
    assert.ok(MSA_HUB_MOUNT_REGISTRY.cognitive === 'CognitiveMsaHub');
  });

  await testAsync('Etapa 0 audit — tenant pilot binding_ratio = 0 (Cenário A)', async () => {
    const binding = await runMsaSignalBinding({ company_id: EMPTY_TENANT }, {});
    console.log(`    MSA_BINDING_RATIO=${binding.binding_ratio}`);
    console.log(`    MSA_BOUND_BLOCKS=${JSON.stringify(binding.bound_blocks || [])}`);
    console.log(`    MSA_DATASET_STATUS=${binding.signal_readiness}`);
    assert.strictEqual(binding.binding_ratio, 0);
    assert.strictEqual(binding.signal_readiness, 'NO_DATASET');
    assert.deepStrictEqual(binding.bound_blocks, []);
    assert.strictEqual(binding.missing_blocks.length, 12);
  });

  await testAsync('Z.22 gate blocks promotion when binding_ratio = 0', async () => {
    const pilot = {
      shadow_cognitive_cockpit: { blocks: [] },
      engine_bridge: {
        binding_ratio: 0,
        bound_blocks: [],
        missing_blocks: [{ block_id: 'msa.measurement_system_registry', reason: 'NO_DATASET' }],
        signal_readiness: 'NO_DATASET'
      }
    };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prev = process.env.IMPETUS_MSA_RENDER_PROMOTION;
    process.env.IMPETUS_MSA_RENDER_PROMOTION = 'controlled';
    try {
      const eligibility = evaluateMsaRenderPromotionEligibility({}, payload, {}, pilot);
      assert.strictEqual(eligibility.allowed, false);
      assert.strictEqual(eligibility.reason, 'insufficient_binding_no_dataset');
      const out = applyMsaControlledRenderPromotion({}, payload, {}, pilot);
      assert.strictEqual(out.cognitive_render_promotion.promotion_applied, false);
      assert.strictEqual(out.cognitive_render_promotion.binding_ratio, 0);
      assert.strictEqual(out.cognitive_render_promotion.gate_scenario, 'A_NO_DATASET');
    } finally {
      if (prev == null) delete process.env.IMPETUS_MSA_RENDER_PROMOTION;
      else process.env.IMPETUS_MSA_RENDER_PROMOTION = prev;
    }
  });

  await testAsync('Z.22 Cenário B — below threshold documents missing blocks', async () => {
    const pilot = {
      shadow_cognitive_cockpit: { blocks: [] },
      engine_bridge: {
        binding_ratio: 0.25,
        bound_blocks: ['msa.measurement_system_registry'],
        missing_blocks: [{ block_id: 'msa.variable_grr', reason: 'NO_DATASET' }],
        signal_readiness: 'partial'
      }
    };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prev = process.env.IMPETUS_MSA_RENDER_PROMOTION;
    process.env.IMPETUS_MSA_RENDER_PROMOTION = 'controlled';
    try {
      const out = applyMsaControlledRenderPromotion({}, payload, {}, pilot);
      assert.strictEqual(out.cognitive_render_promotion.promotion_applied, false);
      assert.strictEqual(out.cognitive_render_promotion.gate_scenario, 'B_BELOW_THRESHOLD');
      assert.ok(out.cognitive_render_promotion.missing_blocks.length > 0);
    } finally {
      if (prev == null) delete process.env.IMPETUS_MSA_RENDER_PROMOTION;
      else process.env.IMPETUS_MSA_RENDER_PROMOTION = prev;
    }
  });

  await testAsync('Z.22 promotion passive — does not recalculate binding when gate passes', async () => {
    const pilot = {
      shadow_cognitive_cockpit: {
        blocks: [{ block_id: 'msa.measurement_system_registry', eligible: true, shadow_signals: { binding_ok: true } }]
      },
      engine_bridge: {
        binding_ratio: 0.583,
        bound_blocks: ['msa.measurement_system_registry'],
        missing_blocks: [],
        signal_readiness: 'ready'
      }
    };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prev = process.env.IMPETUS_MSA_RENDER_PROMOTION;
    process.env.IMPETUS_MSA_RENDER_PROMOTION = 'controlled';
    try {
      const out = applyMsaControlledRenderPromotion({}, payload, {}, pilot);
      assert.strictEqual(out.cognitive_render_promotion.promotion_applied, true);
      assert.strictEqual(out.cognitive_render_promotion.cockpit_mode, 'msa_native');
      assert.strictEqual(out.cognitive_render_promotion.binding_ratio, 0.583);
      assert.ok(Array.isArray(out.payload.widgets_promoted));
    } finally {
      if (prev == null) delete process.env.IMPETUS_MSA_RENDER_PROMOTION;
      else process.env.IMPETUS_MSA_RENDER_PROMOTION = prev;
    }
  });

  await testAsync('Z.22: force_msa_render does NOT bypass binding', async () => {
    const pilot = {
      shadow_cognitive_cockpit: { blocks: [] },
      engine_bridge: { binding_ratio: 0.1, bound_blocks: [], missing_blocks: ['x'], signal_readiness: 'NO_DATASET' }
    };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prev = process.env.IMPETUS_MSA_RENDER_PROMOTION;
    process.env.IMPETUS_MSA_RENDER_PROMOTION = 'controlled';
    try {
      const out = evaluateMsaRenderPromotionEligibility({}, payload, { force_msa_render: true }, pilot);
      assert.strictEqual(out.allowed, false, 'MSA force must not bypass binding');
    } finally {
      if (prev == null) delete process.env.IMPETUS_MSA_RENDER_PROMOTION;
      else process.env.IMPETUS_MSA_RENDER_PROMOTION = prev;
    }
  });

  await testAsync('Z.23 consolidation requires Z.22 promotion_applied', async () => {
    const pilot = {
      shadow_cognitive_cockpit: { blocks: [] },
      engine_bridge: { binding_ratio: 0.583, bound_blocks: ['msa.measurement_system_registry'] }
    };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prev = process.env.IMPETUS_MSA_NATIVE_COCKPIT;
    process.env.IMPETUS_MSA_NATIVE_COCKPIT = 'on';
    try {
      const blocked = evaluateMsaConsolidationEligibility(payload, {}, pilot);
      assert.strictEqual(blocked.allowed, false);
      assert.strictEqual(blocked.reason, 'z22_render_promotion_required');
    } finally {
      if (prev == null) delete process.env.IMPETUS_MSA_NATIVE_COCKPIT;
      else process.env.IMPETUS_MSA_NATIVE_COCKPIT = prev;
    }

    const user = { company_id: EMPTY_TENANT };
    const promoted = await applyMsaCockpitConsolidation(
      user,
      {
        ...payload,
        cognitive_render_promotion: { promotion_applied: true, cockpit_mode: 'msa_native' }
      },
      { force_msa_consolidation: true },
      pilot
    );
    assert.strictEqual(promoted.msa_cognitive_runtime.consolidation_applied, true);
    assert.strictEqual(promoted.msa_cognitive_runtime.cockpit_mode, 'msa_native');
    assert.strictEqual(promoted.payload.msa_cognitive_centers.length, 6);
  });

  await testAsync('Z.23: force_msa_consolidation does NOT bypass binding', async () => {
    const pilot = {
      shadow_cognitive_cockpit: { blocks: [] },
      engine_bridge: { binding_ratio: 0.1, bound_blocks: [], missing_blocks: ['x'], signal_readiness: 'NO_DATASET' }
    };
    const payload = {
      profile_code: 'manager_quality',
      functional_area: 'quality',
      cognitive_render_promotion: { promotion_applied: true, cockpit_mode: 'msa_native' }
    };
    const prev = process.env.IMPETUS_MSA_NATIVE_COCKPIT;
    process.env.IMPETUS_MSA_NATIVE_COCKPIT = 'on';
    try {
      const out = evaluateMsaConsolidationEligibility(payload, { force_msa_consolidation: true }, pilot);
      assert.strictEqual(out.allowed, false);
    } finally {
      if (prev == null) delete process.env.IMPETUS_MSA_NATIVE_COCKPIT;
      else process.env.IMPETUS_MSA_NATIVE_COCKPIT = prev;
    }
  });

  await testAsync('facade keeps promotion OFF on real tenant without force (Cenário A)', async () => {
    const user = { company_id: EMPTY_TENANT, role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prevPilot = process.env.IMPETUS_MSA_COGNITIVE_RUNTIME_ENABLED;
    const prevRender = process.env.IMPETUS_MSA_RENDER_PROMOTION;
    const prevCockpit = process.env.IMPETUS_MSA_NATIVE_COCKPIT;
    process.env.IMPETUS_MSA_COGNITIVE_RUNTIME_ENABLED = 'on';
    process.env.IMPETUS_MSA_RENDER_PROMOTION = 'controlled';
    process.env.IMPETUS_MSA_NATIVE_COCKPIT = 'on';
    try {
      const result = await applyCognitiveFoundationToDashboard(user, payload, {
        force_cognitive_observability: true,
        force_msa_pilot: true
      });
      const rt = result.payload.msa_cognitive_runtime;
      assert.ok(rt);
      assert.strictEqual(rt.consolidation_applied, false);
      assert.strictEqual(rt.promotion_applied, false);
      assert.strictEqual(rt.inactive, true);
      assert.strictEqual(result.payload.msa_signal_loader.binding_ratio, 0);
      assert.ok(result.payload.msa_signal_loader);
      assert.deepStrictEqual(result.payload.msa_signal_loader.bound_blocks, []);
      assert.deepStrictEqual(result.payload.msa_cognitive_centers, []);
    } finally {
      if (prevPilot == null) delete process.env.IMPETUS_MSA_COGNITIVE_RUNTIME_ENABLED;
      else process.env.IMPETUS_MSA_COGNITIVE_RUNTIME_ENABLED = prevPilot;
      if (prevRender == null) delete process.env.IMPETUS_MSA_RENDER_PROMOTION;
      else process.env.IMPETUS_MSA_RENDER_PROMOTION = prevRender;
      if (prevCockpit == null) delete process.env.IMPETUS_MSA_NATIVE_COCKPIT;
      else process.env.IMPETUS_MSA_NATIVE_COCKPIT = prevCockpit;
    }
  });

  await testAsync('quality + ppap payloads preserved with msa promotion infrastructure', async () => {
    const user = { company_id: EMPTY_TENANT, role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.strictEqual(result.payload.profile_code, 'manager_quality');
    assert.ok(result.payload.specialized_cockpit_runtime || result.payload.quality_cognitive_centers);
    assert.ok(result.payload.msa_cognitive_runtime);
    assert.strictEqual(result.payload.msa_cognitive_runtime.inactive, true);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
