'use strict';

const assert = require('assert');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { applyIshikawaControlledRenderPromotion } = require('../../src/cognitiveRuntime/renderPromotion/ishikawa/ishikawaControlledRenderRuntime');
const { applyIshikawaCockpitConsolidation } = require('../../src/cognitiveRuntime/domains/ishikawa/runtime/ishikawaCockpitConsolidationRuntime');
const { ISHIKAWA_HUB_MOUNT_REGISTRY } = require('../../src/cognitiveRuntime/domains/ishikawa/cockpit/ishikawaCenters');
const { evaluateIshikawaConsolidationEligibility } = require('../../src/cognitiveRuntime/domains/ishikawa/cockpit/ishikawaConsolidationSupervisor');
const { evaluateIshikawaRenderPromotionEligibility } = require('../../src/cognitiveRuntime/renderPromotion/ishikawa/ishikawaRenderPromotionSupervisor');
const { runIshikawaSignalBinding } = require('../../src/cognitiveRuntime/domains/ishikawa/bridge/ishikawaSignalBindingRuntime');

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

function buildPilot(bindingRatio, boundCount = 0) {
  const bound_blocks = Array.from({ length: boundCount }, (_, i) => `ishikawa.block_${i}`);
  return {
    shadow_cognitive_cockpit: {
      blocks: bound_blocks.map((block_id) => ({
        block_id,
        eligible: true,
        shadow_signals: { binding_ok: true, signal_count: 1, reason: 'BOUND' }
      }))
    },
    engine_bridge: {
      binding_ratio: bindingRatio,
      bound_blocks,
      missing_blocks: [],
      signal_readiness: bindingRatio === 0 ? 'NO_DATASET' : bindingRatio >= 0.5 ? 'ready' : 'partial'
    }
  };
}

(async () => {
  console.log('GF-018 — Ishikawa Promotion Chain Tests\n');

  test('hub mount registry has 10 canonical hubs', () => {
    assert.strictEqual(Object.keys(ISHIKAWA_HUB_MOUNT_REGISTRY).length, 10);
    assert.ok(ISHIKAWA_HUB_MOUNT_REGISTRY.fishbone === 'FishboneHub');
    assert.ok(ISHIKAWA_HUB_MOUNT_REGISTRY.narrative === 'NarrativeHub');
  });

  await testAsync('Cenário A — binding_ratio = 0.00 blocks promotion', async () => {
    const pilot = buildPilot(0, 0);
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prev = process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
    process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = 'controlled';
    try {
      const out = applyIshikawaControlledRenderPromotion({}, payload, {}, pilot);
      assert.strictEqual(out.cognitive_render_promotion.promotion_applied, false);
      assert.strictEqual(out.cognitive_render_promotion.binding_ratio, 0);
      assert.strictEqual(out.cognitive_render_promotion.gate_scenario, 'A_NO_DATASET');
    } finally {
      if (prev == null) delete process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
      else process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = prev;
    }
  });

  await testAsync('Cenário B — binding_ratio = 0.35 blocks promotion (INSUFFICIENT_BINDING)', async () => {
    const pilot = buildPilot(0.35, 4);
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prev = process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
    process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = 'controlled';
    try {
      const eligibility = evaluateIshikawaRenderPromotionEligibility({}, payload, {}, pilot);
      assert.strictEqual(eligibility.allowed, false);
      assert.strictEqual(eligibility.reason, 'INSUFFICIENT_BINDING');
      const out = applyIshikawaControlledRenderPromotion({}, payload, {}, pilot);
      assert.strictEqual(out.cognitive_render_promotion.promotion_applied, false);
      assert.strictEqual(out.cognitive_render_promotion.gate_scenario, 'B_BELOW_THRESHOLD');
      assert.strictEqual(out.cognitive_render_promotion.reason, 'INSUFFICIENT_BINDING');
    } finally {
      if (prev == null) delete process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
      else process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = prev;
    }
  });

  await testAsync('Cenário C — binding_ratio = 0.50 applies promotion (passive binding)', async () => {
    const pilot = buildPilot(0.5, 6);
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prev = process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
    process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = 'controlled';
    try {
      const out = applyIshikawaControlledRenderPromotion({}, payload, {}, pilot);
      assert.strictEqual(out.cognitive_render_promotion.promotion_applied, true);
      assert.strictEqual(out.cognitive_render_promotion.cockpit_mode, 'ishikawa_native');
      assert.strictEqual(out.cognitive_render_promotion.binding_ratio, 0.5);
      assert.strictEqual(out.cognitive_render_promotion.gate_scenario, 'C_GATE_PASS');
    } finally {
      if (prev == null) delete process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
      else process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = prev;
    }
  });

  await testAsync('Cenário D — binding_ratio = 1.00 promotion + consolidation', async () => {
    const pilot = buildPilot(1, 12);
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prevRender = process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
    const prevCockpit = process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT;
    process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = 'controlled';
    process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT = 'on';
    try {
      const promoted = applyIshikawaControlledRenderPromotion({}, payload, {}, pilot);
      assert.strictEqual(promoted.cognitive_render_promotion.promotion_applied, true);
      const consolidated = await applyIshikawaCockpitConsolidation(
        {},
        { ...promoted.payload, cognitive_render_promotion: promoted.cognitive_render_promotion },
        { force_ishikawa_consolidation: true },
        pilot
      );
      assert.strictEqual(consolidated.ishikawa_cognitive_runtime.consolidation_applied, true);
      assert.strictEqual(consolidated.ishikawa_cognitive_runtime.promotion_applied, true);
      assert.strictEqual(consolidated.ishikawa_cognitive_runtime.cockpit_mode, 'ishikawa_native');
      assert.strictEqual(consolidated.payload.ishikawa_cognitive_centers.length, 10);
      assert.strictEqual(consolidated.ishikawa_cognitive_runtime.binding_ratio, 1);
    } finally {
      if (prevRender == null) delete process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
      else process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = prevRender;
      if (prevCockpit == null) delete process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT;
      else process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT = prevCockpit;
    }
  });

  await testAsync('Z.22: force_ishikawa_render does NOT bypass binding', async () => {
    const pilot = buildPilot(0.1, 1);
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prev = process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
    process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = 'controlled';
    try {
      const out = evaluateIshikawaRenderPromotionEligibility({}, payload, { force_ishikawa_render: true }, pilot);
      assert.strictEqual(out.allowed, false, 'force must not bypass binding');
    } finally {
      if (prev == null) delete process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
      else process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = prev;
    }
  });

  await testAsync('Z.23 consolidation requires Z.22 promotion_applied', async () => {
    const pilot = buildPilot(0.583, 7);
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prev = process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT;
    process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT = 'on';
    try {
      const blocked = evaluateIshikawaConsolidationEligibility(payload, {}, pilot);
      assert.strictEqual(blocked.allowed, false);
      assert.strictEqual(blocked.reason, 'z22_render_promotion_required');
    } finally {
      if (prev == null) delete process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT;
      else process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT = prev;
    }
  });

  await testAsync('Z.23: force_ishikawa_consolidation does NOT bypass binding', async () => {
    const pilot = buildPilot(0.1, 1);
    const payload = {
      profile_code: 'manager_quality',
      functional_area: 'quality',
      cognitive_render_promotion: { promotion_applied: true, cockpit_mode: 'ishikawa_native' }
    };
    const prev = process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT;
    process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT = 'on';
    try {
      const out = evaluateIshikawaConsolidationEligibility(payload, { force_ishikawa_consolidation: true }, pilot);
      assert.strictEqual(out.allowed, false);
    } finally {
      if (prev == null) delete process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT;
      else process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT = prev;
    }
  });

  await testAsync('Etapa 0 audit — empty tenant binding_ratio = 0 (real signal loader)', async () => {
    const binding = await runIshikawaSignalBinding({ company_id: EMPTY_TENANT }, {});
    assert.strictEqual(binding.binding_ratio, 0);
    assert.strictEqual(binding.signal_readiness, 'NO_DATASET');
  });

  await testAsync('facade keeps promotion OFF on real tenant without dataset (Cenário A)', async () => {
    const user = { company_id: EMPTY_TENANT, role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const prevPilot = process.env.IMPETUS_ISHIKAWA_COGNITIVE_RUNTIME_ENABLED;
    const prevRender = process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
    const prevCockpit = process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT;
    process.env.IMPETUS_ISHIKAWA_COGNITIVE_RUNTIME_ENABLED = 'on';
    process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = 'controlled';
    process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT = 'on';
    try {
      const result = await applyCognitiveFoundationToDashboard(user, payload, {
        force_cognitive_observability: true,
        force_ishikawa_pilot: true
      });
      const rt = result.payload.ishikawa_cognitive_runtime;
      assert.ok(rt);
      assert.strictEqual(rt.consolidation_applied, false);
      assert.strictEqual(rt.promotion_applied, false);
      assert.strictEqual(rt.inactive, true);
      assert.strictEqual(result.payload.ishikawa_signal_loader.binding_ratio, 0);
      assert.deepStrictEqual(result.payload.ishikawa_cognitive_centers, []);
    } finally {
      if (prevPilot == null) delete process.env.IMPETUS_ISHIKAWA_COGNITIVE_RUNTIME_ENABLED;
      else process.env.IMPETUS_ISHIKAWA_COGNITIVE_RUNTIME_ENABLED = prevPilot;
      if (prevRender == null) delete process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
      else process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = prevRender;
      if (prevCockpit == null) delete process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT;
      else process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT = prevCockpit;
    }
  });

  await testAsync('quality + ppap + msa payloads preserved with ishikawa promotion infrastructure', async () => {
    const user = { company_id: EMPTY_TENANT, role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.ok(result.payload.msa_cognitive_runtime);
    assert.ok(result.payload.ishikawa_cognitive_runtime);
    assert.strictEqual(result.payload.msa_cognitive_runtime.inactive, true);
    assert.strictEqual(result.payload.ishikawa_cognitive_runtime.inactive, true);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
