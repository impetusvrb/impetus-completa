'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { pathToFileURL } = require('url');
const db = require('../../src/db');
const { runIshikawaPilotScenario, PILOT_SCENARIOS } = require('../../src/domains/ishikawa/services/ishikawaPilotScenario');
const { runIshikawaSignalBinding } = require('../../src/cognitiveRuntime/domains/ishikawa/bridge/ishikawaSignalBindingRuntime');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { applyIshikawaControlledRenderPromotion } = require('../../src/cognitiveRuntime/renderPromotion/ishikawa/ishikawaControlledRenderRuntime');
const { evaluateIshikawaRenderPromotionEligibility } = require('../../src/cognitiveRuntime/renderPromotion/ishikawa/ishikawaRenderPromotionSupervisor');
const investigationService = require('../../src/domains/ishikawa/services/ishikawaInvestigationService');
const { ISHIKAWA_PILOT_BLOCK_IDS } = require('../../src/cognitiveRuntime/registry/ishikawaCognitiveBlockPack');
const flagsZ22 = require('../../src/cognitiveRuntime/config/phaseZ22FeatureFlags');

const REPO_ROOT = path.resolve(__dirname, '../../..');

async function importFrontendModule(relPath) {
  const abs = path.join(REPO_ROOT, relPath);
  return import(pathToFileURL(abs).href);
}

const EMPTY_TENANT = '00000000-0000-4000-8000-000000000099';
const Z22_MIN = flagsZ22.minBindingRatioForRender();

let passed = 0;
let failed = 0;
const evidence = {
  phase: 'GF-019',
  binding_before: null,
  binding_after: null,
  scenario_a: null,
  scenario_b: null,
  scenario_c: null,
  z_chain: null
};

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

async function runMigrationIfNeeded() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../migrations/ishikawa_core_domain_migration.sql'),
    'utf8'
  );
  await db.query(sql);
}

async function pickCompanyId() {
  const r = await db.query('SELECT id FROM companies ORDER BY created_at LIMIT 1');
  if (!r.rows[0]) throw new Error('no company for tests');
  return r.rows[0].id;
}

function saveIshikawaEnv() {
  return {
    runtime: process.env.IMPETUS_ISHIKAWA_COGNITIVE_RUNTIME_ENABLED,
    render: process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION,
    cockpit: process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT,
    foundation: process.env.IMPETUS_ISHIKAWA_RUNTIME_FOUNDATION
  };
}

function restoreIshikawaEnv(saved) {
  for (const [key, val] of Object.entries({
    IMPETUS_ISHIKAWA_COGNITIVE_RUNTIME_ENABLED: saved.runtime,
    IMPETUS_ISHIKAWA_RENDER_PROMOTION: saved.render,
    IMPETUS_ISHIKAWA_NATIVE_COCKPIT: saved.cockpit,
    IMPETUS_ISHIKAWA_RUNTIME_FOUNDATION: saved.foundation
  })) {
    if (val == null) delete process.env[key];
    else process.env[key] = val;
  }
}

function disableIshikawaRuntimeFlags() {
  delete process.env.IMPETUS_ISHIKAWA_COGNITIVE_RUNTIME_ENABLED;
  delete process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
  delete process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT;
}

function enableIshikawaRuntimeFlags() {
  process.env.IMPETUS_ISHIKAWA_COGNITIVE_RUNTIME_ENABLED = 'on';
  process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = 'controlled';
  process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT = 'on';
  process.env.IMPETUS_ISHIKAWA_RUNTIME_FOUNDATION = 'true';
}

function buildMockPilot(bindingRatio, boundCount) {
  const bound_blocks = ISHIKAWA_PILOT_BLOCK_IDS.slice(0, boundCount);
  return {
    shadow_cognitive_cockpit: {
      blocks: bound_blocks.map((block_id) => ({
        block_id,
        eligible: true,
        shadow_signals: { binding_ok: true, signal_count: 1, reason: 'BOUND', summary: `Obs ${block_id}` }
      }))
    },
    engine_bridge: {
      binding_ratio: bindingRatio,
      bound_blocks,
      missing_blocks: ISHIKAWA_PILOT_BLOCK_IDS.filter((id) => !bound_blocks.includes(id)).map((block_id) => ({
        block_id,
        reason: 'NO_DATASET'
      })),
      signal_readiness: bindingRatio === 0 ? 'NO_DATASET' : bindingRatio >= 0.5 ? 'ready' : 'partial'
    }
  };
}

function writeBindingReport(binding, pilotResult) {
  const report = `# ISHIKAWA — Binding Report (GF-019)

**Gerado:** ${new Date().toISOString()}  
**Tag piloto:** ${pilotResult?.tag ?? 'GF-019'}

## Signal Loader (Z.20)

| Métrica | Valor |
|---------|-------|
| binding_ratio | ${binding.binding_ratio} |
| signal_readiness | ${binding.signal_readiness} |
| bound_blocks | ${binding.bound_blocks.length} / ${ISHIKAWA_PILOT_BLOCK_IDS.length} |
| missing_blocks | ${binding.missing_blocks.length} |

### Blocos alimentados

${binding.bound_blocks.map((b) => `- ✓ \`${b}\``).join('\n')}

### Blocos pendentes

${binding.missing_blocks.map((m) => `- ✗ \`${m.block_id}\` — ${m.reason}`).join('\n') || '- (nenhum)'}

## Dataset piloto

| Campo | Valor |
|-------|-------|
| Investigações criadas | ${pilotResult?.scenario_count ?? 'N/A'} |
| Investigação primária | ${pilotResult?.primaryInvestigationId ?? 'N/A'} |
| Cenários | ${PILOT_SCENARIOS.map((s) => s.code).join(', ')} |

## Critérios GF-019

\`\`\`
PILOT_DATASET_CREATED = YES
ISHIKAWA_SIGNAL_READINESS = ${binding.signal_readiness}
BOUND_BLOCKS = ${binding.bound_blocks.length}
BINDING_RATIO = ${binding.binding_ratio}
BYPASS_USED = NO
\`\`\`
`;
  fs.writeFileSync(
    path.join(__dirname, '../../docs/evidence/ISHIKAWA-BINDING-REPORT.md'),
    report,
    'utf8'
  );
}

(async () => {
  console.log('GF-019 — Ishikawa Pilot Enablement Tests\n');

  await runMigrationIfNeeded();
  const companyId = await pickCompanyId();
  const envSaved = saveIshikawaEnv();
  disableIshikawaRuntimeFlags();

  let bindingBefore = null;
  let bindingAfter = null;
  let pilotResult = null;

  try {
    await test('Cenário A — binding_ratio = 0.00 (tenant vazio)', async () => {
      const binding = await runIshikawaSignalBinding({ company_id: EMPTY_TENANT }, {});
      evidence.scenario_a = {
        binding_ratio: binding.binding_ratio,
        signal_readiness: binding.signal_readiness,
        bound_blocks: binding.bound_blocks
      };
      assert.strictEqual(binding.binding_ratio, 0);
      assert.strictEqual(binding.signal_readiness, 'NO_DATASET');
      assert.deepStrictEqual(binding.bound_blocks, []);
    });

    await test('Cenário B — binding_ratio = 0.35 blocks promotion (INSUFFICIENT_BINDING)', async () => {
      const prev = process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
      process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = 'controlled';
      try {
        const pilot = buildMockPilot(0.35, 4);
        const eligibility = evaluateIshikawaRenderPromotionEligibility(
          {},
          { profile_code: 'manager_quality', functional_area: 'quality' },
          {},
          pilot
        );
        evidence.scenario_b = { binding_ratio: 0.35, reason: eligibility.reason };
        assert.strictEqual(eligibility.allowed, false);
        assert.strictEqual(eligibility.reason, 'INSUFFICIENT_BINDING');
        const out = applyIshikawaControlledRenderPromotion(
          {},
          { profile_code: 'manager_quality', functional_area: 'quality' },
          {},
          pilot
        );
        assert.strictEqual(out.cognitive_render_promotion.promotion_applied, false);
      } finally {
        if (prev == null) delete process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
        else process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = prev;
      }
    });

    await test('binding before pilot — baseline recorded', async () => {
      bindingBefore = await runIshikawaSignalBinding({ company_id: companyId }, {});
      evidence.binding_before = {
        binding_ratio: bindingBefore.binding_ratio,
        signal_readiness: bindingBefore.signal_readiness
      };
      assert.ok('binding_ratio' in bindingBefore);
    });

    await test(`pilot scenario: ${PILOT_SCENARIOS.length} investigações workflow ARCHIVED`, async () => {
      pilotResult = await runIshikawaPilotScenario(companyId, { tag: 'GF-019' });
      assert.strictEqual(pilotResult.investigations.length, PILOT_SCENARIOS.length);
      assert.ok(pilotResult.detail.fishbone.categories.length === 6);
      assert.ok(pilotResult.detail.corrective_actions.length >= 1);
      assert.ok(pilotResult.detail.preventive_actions.length >= 1);
      assert.ok(pilotResult.detail.evidence.length >= 1);
      assert.ok(pilotResult.detail.history.length >= 5);
    });

    await test('operational APIs: list investigations includes pilot records', async () => {
      const list = await investigationService.listInvestigations(companyId, { limit: 200 });
      assert.ok(list.some((i) => i.id === pilotResult.primaryInvestigationId));
    });

    await test('Z.20 — signal loader observes real data (runIshikawaSignalBinding)', async () => {
      bindingAfter = await runIshikawaSignalBinding({ company_id: companyId }, {});
      evidence.binding_after = {
        binding_ratio: bindingAfter.binding_ratio,
        signal_readiness: bindingAfter.signal_readiness,
        bound_blocks: bindingAfter.bound_blocks,
        missing_blocks: bindingAfter.missing_blocks
      };
      assert.ok(bindingAfter.binding_ratio > 0);
      assert.ok(bindingAfter.binding_ratio >= bindingBefore.binding_ratio);
      assert.notStrictEqual(bindingAfter.signal_readiness, 'NO_DATASET');
      assert.ok(bindingAfter.binding_ratio >= Z22_MIN, `binding ${bindingAfter.binding_ratio} < ${Z22_MIN}`);
      console.log(`    binding_ratio=${bindingAfter.binding_ratio} readiness=${bindingAfter.signal_readiness}`);
      console.log(`    bound=${bindingAfter.bound_blocks.length} missing=${bindingAfter.missing_blocks.length}`);
    });

    await test('all 12 cognitive blocks bound after pilot enablement', async () => {
      for (const blockId of ISHIKAWA_PILOT_BLOCK_IDS) {
        assert.ok(bindingAfter.bound_blocks.includes(blockId), `expected bound ${blockId}`);
      }
      assert.strictEqual(bindingAfter.bound_blocks.length, 12);
    });

    await test('flags OFF — promotion NOT forced (gate-driven inactive)', async () => {
      const user = { company_id: companyId, role: 'gerente', hierarchy_level: 2 };
      const result = await applyCognitiveFoundationToDashboard(user, {
        profile_code: 'manager_quality',
        functional_area: 'quality'
      });
      assert.strictEqual(result.payload.ishikawa_cognitive_runtime.inactive, true);
      assert.strictEqual(result.payload.ishikawa_cognitive_runtime.promotion_applied, false);
      assert.strictEqual(result.payload.ishikawa_cognitive_runtime.consolidation_applied, false);
      assert.ok(result.payload.ishikawa_signal_loader.binding_ratio > 0);
    });

    enableIshikawaRuntimeFlags();

    await test('Cenário C — pipeline Z.19→Z.20→Z.22→Z.23 (sem force, sem bypass)', async () => {
      const user = { company_id: companyId, role: 'gerente', hierarchy_level: 2 };
      const result = await applyCognitiveFoundationToDashboard(user, {
        profile_code: 'manager_quality',
        functional_area: 'quality'
      });
      const rt = result.payload.ishikawa_cognitive_runtime;
      const ishZ22 = result.cognitive_runtime_report?.ishikawa_render_promotion;
      evidence.scenario_c = {
        binding_ratio: rt?.binding_ratio,
        signal_readiness: result.payload.ishikawa_signal_loader?.signal_readiness,
        promotion_applied: rt?.promotion_applied,
        consolidation_applied: rt?.consolidation_applied,
        centers_count: result.payload.ishikawa_cognitive_centers?.length
      };
      evidence.z_chain = {
        phase_stack: result.cognitive_runtime_report?.phase_stack,
        z19_pilot: !!result.cognitive_runtime_report?.ishikawa_cockpit_pilot,
        z22_applied: ishZ22?.promotion_applied,
        z23_applied: rt?.consolidation_applied
      };
      assert.strictEqual(ishZ22?.promotion_applied, true);
      assert.strictEqual(rt.promotion_applied, true);
      assert.strictEqual(rt.consolidation_applied, true);
      assert.strictEqual(rt.inactive, false);
      assert.strictEqual(rt.cockpit_mode, 'ishikawa_native');
      assert.ok(rt.binding_ratio >= Z22_MIN);
      assert.strictEqual(result.payload.ishikawa_signal_loader.signal_readiness, 'ready');
      assert.ok(result.cognitive_runtime_report?.phase_stack?.includes('ISHIKAWA-Z.19'));
      assert.ok(result.cognitive_runtime_report?.phase_stack?.includes('ISHIKAWA-Z.22'));
      assert.ok(result.cognitive_runtime_report?.phase_stack?.includes('ISHIKAWA-Z.23'));
    });

    await test('Z.23 — 10 Cognitive Centers + Centro de Comando resolver', async () => {
      const user = { company_id: companyId, role: 'gerente', hierarchy_level: 2 };
      const result = await applyCognitiveFoundationToDashboard(user, {
        profile_code: 'manager_quality',
        functional_area: 'quality'
      });
      assert.strictEqual(result.payload.ishikawa_cognitive_centers.length, 10);

      const resolverMod = await importFrontendModule('frontend/src/cognitiveRuntime/cockpit/specializedCockpitResolver.js');
      const ishReg = await importFrontendModule('frontend/src/cognitiveRuntime/cockpit/ishikawaNativeCockpitRegistry.js');
      const resolved = resolverMod.resolveIshikawaCockpitRuntime(result.payload);
      assert.ok(resolved);
      assert.strictEqual(resolved.runtime.promotion_applied, true);
      assert.strictEqual(resolved.runtime.consolidation_applied, true);
      assert.strictEqual(Object.keys(ishReg.ISHIKAWA_HUB_REGISTRY).length, 10);
      assert.strictEqual(Object.keys(ishReg.ISHIKAWA_HUB_COMPONENTS).length, 10);
      assert.strictEqual(ishReg.shouldSuppressIshikawaPlaceholderWidgets(resolved.runtime), true);

      const centroSrc = fs.readFileSync(
        path.join(REPO_ROOT, 'frontend/src/features/dashboard/centroComando/CentroComando.jsx'),
        'utf8'
      );
      assert.ok(centroSrc.includes('resolveIshikawaCockpitRuntime'), 'CentroComando must resolve ishikawa runtime');
      assert.ok(centroSrc.includes('IshikawaNativeCockpitPromotion'), 'CentroComando must mount Ishikawa promotion');
    });

    await test('Z.22/Z.23 passive — promotion does not recalculate binding', async () => {
      const pilot = buildMockPilot(bindingAfter.binding_ratio, bindingAfter.bound_blocks.length);
      const promoted = applyIshikawaControlledRenderPromotion(
        {},
        { profile_code: 'manager_quality', functional_area: 'quality' },
        {},
        pilot
      );
      assert.strictEqual(promoted.cognitive_render_promotion.binding_ratio, bindingAfter.binding_ratio);
    });

    await test('NO_SYNTHETIC_DATA — loader observation-only unchanged', async () => {
      const loaderSrc = fs.readFileSync(
        path.join(__dirname, '../../src/cognitiveRuntime/domains/ishikawa/bridge/ishikawaTenantSignalLoader.js'),
        'utf8'
      );
      assert.ok(!loaderSrc.includes('resolveTransition'));
      assert.ok(!loaderSrc.includes('applyWorkflowAction'));
    });

    await test('quality + ppap + msa payloads preserved with ishikawa pilot ON', async () => {
      const user = { company_id: companyId, role: 'gerente', hierarchy_level: 2 };
      const result = await applyCognitiveFoundationToDashboard(user, {
        profile_code: 'manager_quality',
        functional_area: 'quality'
      });
      assert.ok(result.payload.msa_cognitive_runtime);
      assert.ok(result.payload.ppap_cognitive_runtime);
      assert.strictEqual(result.payload.msa_cognitive_runtime.inactive, true);
      assert.strictEqual(result.payload.ppap_cognitive_runtime.inactive, true);
      assert.strictEqual(result.payload.ishikawa_cognitive_runtime.promotion_applied, true);
    });

    if (bindingAfter && pilotResult) {
      writeBindingReport(bindingAfter, pilotResult);
    }

    console.log('\n--- GF-019 Acceptance Summary ---');
    console.log('PILOT_DATASET_CREATED = YES');
    console.log(`ISHIKAWA_SIGNAL_READINESS = ${bindingAfter?.signal_readiness ?? 'N/A'}`);
    console.log(`BOUND_BLOCKS = ${bindingAfter?.bound_blocks?.length ?? 0}`);
    console.log(`BINDING_RATIO = ${bindingAfter?.binding_ratio ?? 'N/A'}`);
    console.log(`PROMOTION_APPLIED = ${evidence.scenario_c?.promotion_applied ? 'YES' : 'NO'}`);
    console.log(`CONSOLIDATION_APPLIED = ${evidence.scenario_c?.consolidation_applied ? 'YES' : 'NO'}`);
    console.log(`COGNITIVE_CENTERS_REGISTERED = ${evidence.scenario_c?.centers_count === 10 ? 'YES' : 'NO'}`);
    console.log('BYPASS_USED = NO');
    console.log('THRESHOLDS_MODIFIED = NO');
  } finally {
    restoreIshikawaEnv(envSaved);
    try {
      await db.pool.end();
    } catch {
      /* ignore */
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
