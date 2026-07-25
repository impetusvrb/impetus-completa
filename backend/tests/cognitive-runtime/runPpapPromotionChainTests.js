'use strict';

const assert = require('assert');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { applyPpapControlledRenderPromotion } = require('../../src/cognitiveRuntime/renderPromotion/ppap/ppapControlledRenderRuntime');
const { applyPpapCockpitConsolidation } = require('../../src/cognitiveRuntime/domains/ppap/runtime/ppapCockpitConsolidationRuntime');
const { PPAP_HUB_MOUNT_REGISTRY } = require('../../src/cognitiveRuntime/domains/ppap/cockpit/ppapCenters');
const { evaluatePpapConsolidationEligibility } = require('../../src/cognitiveRuntime/domains/ppap/cockpit/ppapConsolidationSupervisor');
const { evaluatePpapRenderPromotionEligibility } = require('../../src/cognitiveRuntime/renderPromotion/ppap/ppapRenderPromotionSupervisor');
const { runPpapSignalBinding } = require('../../src/cognitiveRuntime/domains/ppap/bridge/ppapSignalBindingRuntime');

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
  console.log('GF-004 — PPAP Promotion Chain Tests\n');

  test('hub mount registry has 6 canonical hubs', () => {
    assert.strictEqual(Object.keys(PPAP_HUB_MOUNT_REGISTRY).length, 6);
    assert.ok(PPAP_HUB_MOUNT_REGISTRY.submission_governance === 'SubmissionGovernanceHub');
    assert.ok(PPAP_HUB_MOUNT_REGISTRY.cognitive === 'CognitivePpapHub');
  });

  await testAsync('Etapa 0 audit — tenant pilot binding_ratio = 0 (Cenário A)', async () => {
    const binding = await runPpapSignalBinding(
      { company_id: '511f4819-fc48-479e-b11e-49ba4fb9c81b' },
      {}
    );
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
        missing_blocks: [{ block_id: 'ppap.submission_management', reason: 'NO_DATASET' }],
        signal_readiness: 'NO_DATASET'
      }
    };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prev = process.env.IMPETUS_PPAP_RENDER_PROMOTION;
    process.env.IMPETUS_PPAP_RENDER_PROMOTION = 'controlled';
    try {
      const eligibility = evaluatePpapRenderPromotionEligibility({}, payload, {}, pilot);
      assert.strictEqual(eligibility.allowed, false);
      assert.strictEqual(eligibility.reason, 'insufficient_binding_no_dataset');
      const out = applyPpapControlledRenderPromotion({}, payload, {}, pilot);
      assert.strictEqual(out.cognitive_render_promotion.promotion_applied, false);
      assert.strictEqual(out.cognitive_render_promotion.binding_ratio, 0);
      assert.strictEqual(out.cognitive_render_promotion.gate_scenario, 'A_NO_DATASET');
    } finally {
      if (prev == null) delete process.env.IMPETUS_PPAP_RENDER_PROMOTION;
      else process.env.IMPETUS_PPAP_RENDER_PROMOTION = prev;
    }
  });

  await testAsync('Z.22 promotion passive — does not recalculate binding when gate passes', async () => {
    const pilot = {
      shadow_cognitive_cockpit: {
        blocks: [{ block_id: 'ppap.submission_management', eligible: true, shadow_signals: { binding_ok: true } }]
      },
      engine_bridge: {
        binding_ratio: 0.583,
        bound_blocks: ['ppap.submission_management'],
        missing_blocks: [],
        signal_readiness: 'ready'
      }
    };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prev = process.env.IMPETUS_PPAP_RENDER_PROMOTION;
    process.env.IMPETUS_PPAP_RENDER_PROMOTION = 'controlled';
    try {
      const out = applyPpapControlledRenderPromotion({}, payload, {}, pilot);
      assert.strictEqual(out.cognitive_render_promotion.promotion_applied, true);
      assert.strictEqual(out.cognitive_render_promotion.cockpit_mode, 'ppap_native');
      assert.strictEqual(out.cognitive_render_promotion.binding_ratio, 0.583);
      assert.ok(Array.isArray(out.payload.widgets_promoted));
    } finally {
      if (prev == null) delete process.env.IMPETUS_PPAP_RENDER_PROMOTION;
      else process.env.IMPETUS_PPAP_RENDER_PROMOTION = prev;
    }
  });

  await testAsync('Z.23 consolidation requires Z.22 promotion_applied', async () => {
    const pilot = {
      shadow_cognitive_cockpit: { blocks: [] },
      engine_bridge: { binding_ratio: 0.583, bound_blocks: ['ppap.submission_management'] }
    };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prev = process.env.IMPETUS_PPAP_NATIVE_COCKPIT;
    process.env.IMPETUS_PPAP_NATIVE_COCKPIT = 'on';
    try {
      const blocked = evaluatePpapConsolidationEligibility(payload, {}, pilot);
      assert.strictEqual(blocked.allowed, false);
      assert.strictEqual(blocked.reason, 'z22_render_promotion_required');
    } finally {
      if (prev == null) delete process.env.IMPETUS_PPAP_NATIVE_COCKPIT;
      else process.env.IMPETUS_PPAP_NATIVE_COCKPIT = prev;
    }

    const user = { company_id: '511f4819-fc48-479e-b11e-49ba4fb9c81b' };
    const promoted = await applyPpapCockpitConsolidation(
      user,
      {
        ...payload,
        cognitive_render_promotion: { promotion_applied: true, cockpit_mode: 'ppap_native' }
      },
      { force_ppap_consolidation: true },
      pilot
    );
    assert.strictEqual(promoted.ppap_cognitive_runtime.consolidation_applied, true);
    assert.strictEqual(promoted.ppap_cognitive_runtime.cockpit_mode, 'ppap_native');
    assert.strictEqual(promoted.payload.ppap_cognitive_centers.length, 6);
  });

  await testAsync('facade keeps promotion OFF on real tenant without force (Cenário A)', async () => {
    const user = { company_id: '511f4819-fc48-479e-b11e-49ba4fb9c81b', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prevPilot = process.env.IMPETUS_PPAP_COGNITIVE_RUNTIME_ENABLED;
    const prevRender = process.env.IMPETUS_PPAP_RENDER_PROMOTION;
    const prevCockpit = process.env.IMPETUS_PPAP_NATIVE_COCKPIT;
    process.env.IMPETUS_PPAP_COGNITIVE_RUNTIME_ENABLED = 'on';
    process.env.IMPETUS_PPAP_RENDER_PROMOTION = 'controlled';
    process.env.IMPETUS_PPAP_NATIVE_COCKPIT = 'on';
    try {
      const result = await applyCognitiveFoundationToDashboard(user, payload, {
        force_cognitive_observability: true,
        force_ppap_pilot: true
      });
      const rt = result.payload.ppap_cognitive_runtime;
      assert.ok(rt);
      assert.strictEqual(rt.consolidation_applied, false);
      assert.strictEqual(rt.promotion_applied, false);
      assert.strictEqual(rt.inactive, true);
      assert.strictEqual(result.payload.ppap_signal_loader.binding_ratio, 0);
      assert.ok(result.payload.ppap_signal_loader);
      assert.deepStrictEqual(result.payload.ppap_signal_loader.bound_blocks, []);
    } finally {
      if (prevPilot == null) delete process.env.IMPETUS_PPAP_COGNITIVE_RUNTIME_ENABLED;
      else process.env.IMPETUS_PPAP_COGNITIVE_RUNTIME_ENABLED = prevPilot;
      if (prevRender == null) delete process.env.IMPETUS_PPAP_RENDER_PROMOTION;
      else process.env.IMPETUS_PPAP_RENDER_PROMOTION = prevRender;
      if (prevCockpit == null) delete process.env.IMPETUS_PPAP_NATIVE_COCKPIT;
      else process.env.IMPETUS_PPAP_NATIVE_COCKPIT = prevCockpit;
    }
  });

  await testAsync('quality profile unaffected by ppap promotion infrastructure', async () => {
    const user = { company_id: '511f4819-fc48-479e-b11e-49ba4fb9c81b', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.strictEqual(result.payload.profile_code, 'manager_quality');
    assert.ok(result.payload.specialized_cockpit_runtime || result.payload.quality_cognitive_centers);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
