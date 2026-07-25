'use strict';

const assert = require('assert');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { applyLogisticsControlledRenderPromotion } = require('../../src/cognitiveRuntime/renderPromotion/logistics/logisticsControlledRenderRuntime');
const { applyLogisticsCockpitConsolidation } = require('../../src/cognitiveRuntime/domains/logistics/runtime/logisticsCockpitConsolidationRuntime');
const { LOGISTICS_HUB_MOUNT_REGISTRY } = require('../../src/cognitiveRuntime/domains/logistics/cockpit/logisticsCenters');
const { evaluateLogisticsConsolidationEligibility } = require('../../src/cognitiveRuntime/domains/logistics/cockpit/logisticsConsolidationSupervisor');

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
  console.log('INC-041 — Logistics Promotion Chain Tests\n');

  test('hub mount registry has 7 canonical hubs', () => {
    assert.strictEqual(Object.keys(LOGISTICS_HUB_MOUNT_REGISTRY).length, 7);
    assert.ok(LOGISTICS_HUB_MOUNT_REGISTRY.warehouse_governance === 'WarehouseGovernanceHub');
    assert.ok(LOGISTICS_HUB_MOUNT_REGISTRY.cognitive === 'CognitiveLogisticsHub');
  });

  await testAsync('Z.22 promotion passive — does not recalculate binding', async () => {
    const pilot = {
      shadow_cognitive_cockpit: {
        blocks: [{ block_id: 'logistics.inventory_health', eligible: true, shadow_signals: { binding_ok: true } }]
      },
      engine_bridge: { binding_ratio: 0.385, bound_blocks: ['logistics.inventory_health'] }
    };
    const user = { company_id: '511f4819-fc48-479e-b11e-49ba4fb9c81b' };
    const payload = { profile_code: 'manager_logistics', functional_area: 'logistics' };
    const out = applyLogisticsControlledRenderPromotion(user, payload, { force_logistics_render: true }, pilot);
    assert.strictEqual(out.cognitive_render_promotion.promotion_applied, true);
    assert.strictEqual(out.cognitive_render_promotion.cockpit_mode, 'logistics_native');
    assert.ok(Array.isArray(out.payload.widgets_promoted));
    assert.strictEqual(out.cognitive_render_promotion.binding_ratio, 0.385);
  });

  await testAsync('Z.23 consolidation requires Z.22 promotion_applied', async () => {
    const pilot = {
      shadow_cognitive_cockpit: { blocks: [] },
      engine_bridge: { binding_ratio: 0.385, bound_blocks: ['logistics.inventory_health'] }
    };
    const payload = { profile_code: 'manager_logistics', functional_area: 'logistics' };
    const prev = process.env.IMPETUS_LOGISTICS_NATIVE_COCKPIT;
    process.env.IMPETUS_LOGISTICS_NATIVE_COCKPIT = 'on';
    try {
      const blocked = evaluateLogisticsConsolidationEligibility(payload, {}, pilot);
      assert.strictEqual(blocked.allowed, false);
      assert.strictEqual(blocked.reason, 'z22_render_promotion_required');
    } finally {
      if (prev == null) delete process.env.IMPETUS_LOGISTICS_NATIVE_COCKPIT;
      else process.env.IMPETUS_LOGISTICS_NATIVE_COCKPIT = prev;
    }

    const user = { company_id: '511f4819-fc48-479e-b11e-49ba4fb9c81b' };
    const promoted = await applyLogisticsCockpitConsolidation(
      user,
      { ...payload, cognitive_render_promotion: { promotion_applied: true, cockpit_mode: 'logistics_native' } },
      { force_logistics_consolidation: true },
      pilot
    );
    assert.strictEqual(promoted.logistics_cognitive_runtime.consolidation_applied, true);
    assert.strictEqual(promoted.logistics_cognitive_runtime.cockpit_mode, 'logistics_native');
    assert.strictEqual(promoted.payload.logistics_cognitive_centers.length, 8);
  });

  await testAsync('facade delivers promotion payload without resetting consolidation', async () => {
    const user = { company_id: '511f4819-fc48-479e-b11e-49ba4fb9c81b', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_logistics', functional_area: 'logistics' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, {
      force_cognitive_observability: true,
      force_logistics_pilot: true,
      force_logistics_render: true,
      force_logistics_consolidation: true
    });
    const rt = result.payload.logistics_cognitive_runtime;
    assert.ok(rt);
    assert.strictEqual(rt.consolidation_applied, true);
    assert.strictEqual(rt.promotion_applied, true);
    assert.strictEqual(rt.runtime_id, 'logistics_native');
    assert.strictEqual(rt.cockpit_mode, 'logistics_native');
    assert.ok(Array.isArray(result.payload.logistics_cognitive_centers));
    assert.strictEqual(result.payload.logistics_cognitive_centers.length, 8);
    assert.ok(result.payload.logistics_signal_loader);
  });

  await testAsync('quality profile unaffected by logistics promotion chain', async () => {
    const user = { company_id: '511f4819-fc48-479e-b11e-49ba4fb9c81b', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.strictEqual(result.payload.profile_code, 'manager_quality');
    assert.ok(result.payload.specialized_cockpit_runtime || result.payload.quality_cognitive_centers);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
