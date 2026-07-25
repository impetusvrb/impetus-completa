'use strict';

const assert = require('assert');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { ISHIKAWA_PILOT_BLOCK_IDS } = require('../../src/cognitiveRuntime/registry/ishikawaCognitiveBlockPack');
const { loadIshikawaTenantSignals } = require('../../src/cognitiveRuntime/domains/ishikawa/bridge/ishikawaTenantSignalLoader');
const { attachIshikawaRuntimeFoundation } = require('../../src/cognitiveRuntime/domains/ishikawa/runtime/ishikawaFoundationAttachment');
const { applyIshikawaControlledRenderPromotion } = require('../../src/cognitiveRuntime/renderPromotion/ishikawa/ishikawaControlledRenderRuntime');
const { applyIshikawaCockpitConsolidation } = require('../../src/cognitiveRuntime/domains/ishikawa/runtime/ishikawaCockpitConsolidationRuntime');
const registry = require('../../src/cognitiveRuntime/registry/cognitiveBlockRegistry');
const domainRegistry = require('../../src/cognitiveRuntime/domainFoundation/registry/cognitiveDomainRegistry');
const { HOMOLOGATED_RUNTIMES, FOUNDATION_RUNTIMES } = require('../architecture-conformance/baselineManifest');

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
  console.log('GF-015 — Ishikawa Runtime Foundation Tests\n');

  test('ISHIKAWA_PILOT_BLOCK_IDS has 12 blocks', () => {
    assert.strictEqual(ISHIKAWA_PILOT_BLOCK_IDS.length, 12);
  });

  test('ishikawa blocks registered in cognitiveBlockRegistry', () => {
    const stats = registry.getRegistryStats();
    assert.strictEqual(stats.ishikawa_pilot_blocks, 12);
    assert.ok(registry.getBlockById('ishikawa.fishbone_analysis'));
    assert.ok(registry.getBlockById('ishikawa.five_whys'));
  });

  test('ishikawa domain in cognitiveDomainRegistry', () => {
    const def = domainRegistry.getDomainDefinition('ishikawa');
    assert.ok(def);
    assert.strictEqual(def.runtime_id, 'ishikawa_native');
    assert.strictEqual(def.cockpit_ready, false);
    assert.strictEqual(def.maturity, 'foundation');
  });

  test('LEGACY_ENGINE_IMPORTED = NO (qualityRootCauseEngine not referenced)', () => {
    const fs = require('fs');
    const path = require('path');
    const root = path.join(__dirname, '../../src/cognitiveRuntime/domains/ishikawa');
    const walk = (dir) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (ent.name.endsWith('.js')) {
          const src = fs.readFileSync(p, 'utf8');
          assert.ok(!src.includes('qualityRootCauseEngine'), `${p} must not import qualityRootCauseEngine`);
        }
      }
    };
    walk(root);
  });

  await testAsync('IshikawaTenantSignalLoader read-only structure (GF-017)', async () => {
    const sig = await loadIshikawaTenantSignals({}, {});
    assert.strictEqual(sig.signal_readiness, 'NO_DATASET');
    assert.strictEqual(sig.foundation_only, false);
    assert.strictEqual(sig.inactive, true);
    assert.ok(sig.datasets);
    assert.strictEqual(sig.mock_signals, false);
  });

  await testAsync('attachIshikawaRuntimeFoundation adds inactive runtime + real loader', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001' };
    const { payload } = await attachIshikawaRuntimeFoundation(user, {});
    assert.strictEqual(payload.ishikawa_cognitive_runtime.runtime_id, 'ishikawa_native');
    assert.strictEqual(payload.ishikawa_cognitive_runtime.consolidation_applied, false);
    assert.strictEqual(payload.ishikawa_cognitive_runtime.promotion_applied, false);
    assert.strictEqual(payload.ishikawa_cognitive_runtime.inactive, true);
    assert.strictEqual(payload.ishikawa_cognitive_runtime.cockpit_mode, 'off');
    assert.deepStrictEqual(payload.ishikawa_cognitive_centers, []);
    assert.ok(payload.ishikawa_signal_loader);
    assert.strictEqual(payload.ishikawa_signal_loader.inactive, true);
    assert.strictEqual(payload.ishikawa_signal_loader.pilot_blocks.length, 12);
    assert.ok(payload.ishikawa_signal_loader.binding_ratio >= 0);
    assert.strictEqual(payload.ishikawa_cognitive_runtime.foundation_status, 'signal_loader_active');
  });

  test('applyIshikawaControlledRenderPromotion gate-driven (GF-018)', () => {
    const prev = process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
    process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = 'controlled';
    try {
      const blocked = applyIshikawaControlledRenderPromotion(
        {},
        { profile_code: 'manager_quality', functional_area: 'quality' },
        {},
        { engine_bridge: { binding_ratio: 0, bound_blocks: [], missing_blocks: [], signal_readiness: 'NO_DATASET' } }
      );
      assert.strictEqual(blocked.cognitive_render_promotion.promotion_applied, false);
      assert.strictEqual(blocked.cognitive_render_promotion.gate_scenario, 'A_NO_DATASET');

      const passed = applyIshikawaControlledRenderPromotion(
        {},
        { profile_code: 'manager_quality', functional_area: 'quality' },
        {},
        {
          shadow_cognitive_cockpit: { blocks: [{ block_id: 'ishikawa.fishbone_analysis', eligible: true }] },
          engine_bridge: { binding_ratio: 0.583, bound_blocks: ['ishikawa.fishbone_analysis'], missing_blocks: [], signal_readiness: 'ready' }
        }
      );
      assert.strictEqual(passed.cognitive_render_promotion.promotion_applied, true);
    } finally {
      if (prev == null) delete process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
      else process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = prev;
    }
  });

  await testAsync('applyIshikawaCockpitConsolidation gate-driven inactive without Z.22', async () => {
    const out = await applyIshikawaCockpitConsolidation({}, { profile_code: 'manager_quality' }, {}, {
      engine_bridge: { binding_ratio: 0.583, bound_blocks: ['ishikawa.fishbone_analysis'] }
    });
    assert.strictEqual(out.ishikawa_cognitive_runtime.consolidation_applied, false);
    assert.strictEqual(out.ishikawa_cognitive_runtime.inactive, true);
    assert.strictEqual(out.skipped, true);
  });

  await testAsync('/dashboard/me cognitive facade attaches ishikawa foundation', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.ok(result.payload.ishikawa_cognitive_runtime);
    assert.strictEqual(result.payload.ishikawa_cognitive_runtime.runtime_id, 'ishikawa_native');
    assert.strictEqual(result.payload.ishikawa_cognitive_runtime.consolidation_applied, false);
    assert.strictEqual(result.payload.ishikawa_cognitive_runtime.inactive, true);
    assert.ok(result.payload.ishikawa_signal_loader);
    assert.deepStrictEqual(result.payload.ishikawa_cognitive_centers, []);
    assert.ok(result.cognitive_runtime_report.ishikawa_runtime_foundation?.registered);
    assert.strictEqual(result.cognitive_runtime_report.ishikawa_runtime_foundation?.signal_loader_real, true);
    assert.strictEqual(result.cognitive_runtime_report.ishikawa_runtime_foundation?.signal_loader_stub, false);
  });

  await testAsync('quality + ppap + msa payloads preserved with ishikawa foundation', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.ok(result.payload.ppap_cognitive_runtime);
    assert.ok(result.payload.msa_cognitive_runtime);
    assert.ok(result.payload.ishikawa_cognitive_runtime);
    assert.strictEqual(result.payload.ppap_cognitive_runtime.inactive, true);
    assert.strictEqual(result.payload.msa_cognitive_runtime.inactive, true);
    assert.strictEqual(result.payload.ishikawa_cognitive_runtime.inactive, true);
  });

  test('10 LOCKED runtimes + ishikawa foundation (SYSTEM v1.3 regression)', () => {
    assert.strictEqual(HOMOLOGATED_RUNTIMES.length, 9);
    assert.ok(FOUNDATION_RUNTIMES.some((r) => r.runtime_id === 'msa_native'));
    assert.ok(FOUNDATION_RUNTIMES.some((r) => r.runtime_id === 'ishikawa_native'));
    const lockedIds = [
      ...HOMOLOGATED_RUNTIMES.map((r) => r.runtime_id),
      'msa_native'
    ];
    assert.strictEqual(lockedIds.length, 10);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
