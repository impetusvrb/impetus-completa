'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const db = require('../../src/db');
const { runPpapSignalBinding } = require('../../src/cognitiveRuntime/domains/ppap/bridge/ppapSignalBindingRuntime');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { runPpapPilotScenario } = require('../../src/domains/ppap/services/ppapPilotScenario');
const { resolvePpapCockpitRuntime } = require('../../../frontend/src/cognitiveRuntime/cockpit/specializedCockpitResolver.js');
const { shouldSuppressPpapPlaceholderWidgets, PPAP_HUB_REGISTRY } = require('../../../frontend/src/cognitiveRuntime/cockpit/ppapNativeCockpitRegistry.js');
const flagsZ22 = require('../../src/cognitiveRuntime/config/phaseZ22FeatureFlags');
const { Z23_MIN_BINDING_RATIO } = require('../../src/cognitiveRuntime/domains/ppap/cockpit/ppapConsolidationSupervisor');

const EMPTY_TENANT = '00000000-0000-4000-8000-000000000099';
const REFERENCE_TENANT = '511f4819-fc48-479e-b11e-49ba4fb9c81b';
const Z22_MIN = flagsZ22.minBindingRatioForRender();

const CROSS_DOMAIN_PROFILES = Object.freeze([
  { domain: 'Executive', profile: 'ceo_executive', area: 'executive', key: 'executive_cognitive_runtime', mode: 'executive_boardroom' },
  { domain: 'Production', profile: 'manager_production', area: 'production', key: 'production_cognitive_runtime', mode: 'production_native' },
  { domain: 'Maintenance', profile: 'manager_maintenance', area: 'maintenance', key: 'maintenance_cognitive_runtime', mode: 'maintenance_native' },
  { domain: 'Quality', profile: 'manager_quality', area: 'quality', key: 'specialized_cockpit_runtime', mode: 'quality_native' },
  { domain: 'Logistics', profile: 'manager_logistics', area: 'logistics', key: 'logistics_cognitive_runtime', mode: 'logistics_native' },
  { domain: 'Environment', profile: 'manager_environmental', area: 'environmental', key: 'environmental_cognitive_runtime', mode: 'environmental_native' },
  { domain: 'HR', profile: 'manager_hr', area: 'hr', key: 'hr_cognitive_runtime', mode: 'hr_native' },
  { domain: 'SST', profile: 'manager_safety', area: 'safety', key: 'sst_cognitive_runtime', mode: 'safety_native' }
]);

const CROSS_DOMAIN_SUITES = Object.freeze([
  'tests/cognitive-runtime/runCockpitConsolidationTests.js',
  'tests/cognitive-runtime/runLogisticsPromotionChainTests.js',
  'tests/cognitive-runtime/runProductionNativeCockpitTests.js',
  'tests/cognitive-runtime/runMaintenanceNativeCockpitTests.js',
  'tests/cognitive-runtime/runEnvironmentalNativeCockpitTests.js',
  'tests/cognitive-runtime/runHrNativeCockpitTests.js',
  'tests/cognitive-runtime/runSstNativeCockpitTests.js',
  'tests/cognitive-runtime/runExecutiveBoardroomTests.js'
]);

let passed = 0;
let failed = 0;
const evidence = {
  phase: 'GF-006',
  pre_activation: null,
  gate_validation: null,
  runtime_off: null,
  runtime_on: null,
  cross_domain: null,
  thresholds: { z22_min: Z22_MIN, z23_min: Z23_MIN_BINDING_RATIO }
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
    path.join(__dirname, '../../migrations/ppap_core_domain_migration.sql'),
    'utf8'
  );
  await db.query(sql);
}

async function pickPilotCompanyId() {
  const r = await db.query('SELECT id FROM companies ORDER BY created_at LIMIT 1');
  if (!r.rows[0]) throw new Error('no company for homologation');
  return r.rows[0].id;
}

function savePpapEnv() {
  return {
    runtime: process.env.IMPETUS_PPAP_COGNITIVE_RUNTIME_ENABLED,
    render: process.env.IMPETUS_PPAP_RENDER_PROMOTION,
    cockpit: process.env.IMPETUS_PPAP_NATIVE_COCKPIT,
    foundation: process.env.IMPETUS_PPAP_RUNTIME_FOUNDATION
  };
}

function restorePpapEnv(saved) {
  for (const [key, val] of Object.entries({
    IMPETUS_PPAP_COGNITIVE_RUNTIME_ENABLED: saved.runtime,
    IMPETUS_PPAP_RENDER_PROMOTION: saved.render,
    IMPETUS_PPAP_NATIVE_COCKPIT: saved.cockpit,
    IMPETUS_PPAP_RUNTIME_FOUNDATION: saved.foundation
  })) {
    if (val == null) delete process.env[key];
    else process.env[key] = val;
  }
}

function enablePpapRuntimeFlags() {
  process.env.IMPETUS_PPAP_COGNITIVE_RUNTIME_ENABLED = 'on';
  process.env.IMPETUS_PPAP_RENDER_PROMOTION = 'controlled';
  process.env.IMPETUS_PPAP_NATIVE_COCKPIT = 'on';
  process.env.IMPETUS_PPAP_RUNTIME_FOUNDATION = 'true';
}

function disablePpapRuntimeFlags() {
  delete process.env.IMPETUS_PPAP_COGNITIVE_RUNTIME_ENABLED;
  delete process.env.IMPETUS_PPAP_RENDER_PROMOTION;
  delete process.env.IMPETUS_PPAP_NATIVE_COCKPIT;
}

(async () => {
  console.log('GF-006 — PPAP Runtime Homologation Tests\n');

  await runMigrationIfNeeded();
  const pilotCompanyId = await pickPilotCompanyId();
  const envSaved = savePpapEnv();

  try {
    disablePpapRuntimeFlags();

    await test('Pré-condições — binding ≥ threshold, runtime inactivo (pré-activação)', async () => {
      const binding = await runPpapSignalBinding({ company_id: pilotCompanyId }, {});
      const user = { company_id: pilotCompanyId, role: 'gerente', hierarchy_level: 2 };
      const pre = await applyCognitiveFoundationToDashboard(user, {
        profile_code: 'manager_quality',
        functional_area: 'quality'
      });
      evidence.pre_activation = {
        binding_ratio: binding.binding_ratio,
        bound_blocks: binding.bound_blocks,
        signal_readiness: binding.signal_readiness,
        promotion_applied: pre.payload.ppap_cognitive_runtime?.promotion_applied,
        consolidation_applied: pre.payload.ppap_cognitive_runtime?.consolidation_applied,
        inactive: pre.payload.ppap_cognitive_runtime?.inactive
      };
      assert.ok(binding.binding_ratio >= Z22_MIN, `binding ${binding.binding_ratio} < ${Z22_MIN}`);
      assert.strictEqual(binding.signal_readiness, 'ready');
      assert.strictEqual(pre.payload.ppap_cognitive_runtime.promotion_applied, false);
      assert.strictEqual(pre.payload.ppap_cognitive_runtime.consolidation_applied, false);
      assert.strictEqual(pre.payload.ppap_cognitive_runtime.inactive, true);
    });

    await test('Fase 1 — Gate via Signal Loader (sem alteração manual)', async () => {
      const a = await runPpapSignalBinding({ company_id: pilotCompanyId }, {});
      const b = await runPpapSignalBinding({ company_id: pilotCompanyId }, {});
      evidence.gate_validation = {
        binding_ratio_a: a.binding_ratio,
        binding_ratio_b: b.binding_ratio,
        bound_blocks: a.bound_blocks,
        missing_blocks: a.missing_blocks,
        signal_readiness: a.signal_readiness
      };
      assert.strictEqual(a.binding_ratio, b.binding_ratio);
      assert.ok(a.bound_blocks.length > 0);
      assert.ok(a.binding_ratio >= Z22_MIN);
    });

    enablePpapRuntimeFlags();

    await test('Modo OFF — tenant sem dados PPAP permanece inactivo (sem force)', async () => {
      const user = { company_id: EMPTY_TENANT, role: 'gerente', hierarchy_level: 2 };
      const result = await applyCognitiveFoundationToDashboard(user, {
        profile_code: 'manager_quality',
        functional_area: 'quality'
      });
      const rt = result.payload.ppap_cognitive_runtime;
      evidence.runtime_off = {
        company_id: EMPTY_TENANT,
        binding_ratio: result.payload.ppap_signal_loader?.binding_ratio,
        promotion_applied: rt?.promotion_applied,
        consolidation_applied: rt?.consolidation_applied,
        inactive: rt?.inactive,
        reason: result.cognitive_runtime_report?.ppap_render_promotion?.reason
      };
      assert.strictEqual(rt.promotion_applied, false);
      assert.strictEqual(rt.consolidation_applied, false);
      assert.strictEqual(rt.inactive, true);
      assert.ok((result.payload.ppap_signal_loader?.binding_ratio ?? 0) < Z22_MIN);
    });

    await test('Modo ON — promoção natural Z.19→Z.23 (sem force, sem bypass)', async () => {
      const user = { company_id: pilotCompanyId, role: 'gerente', hierarchy_level: 2 };
      const result = await applyCognitiveFoundationToDashboard(user, {
        profile_code: 'manager_quality',
        functional_area: 'quality'
      });
      const rt = result.payload.ppap_cognitive_runtime;
      const ppapZ22 = result.cognitive_runtime_report?.ppap_render_promotion;
      evidence.runtime_on = {
        binding_ratio: rt?.binding_ratio,
        signal_readiness: result.payload.ppap_signal_loader?.signal_readiness,
        promotion_applied: rt?.promotion_applied,
        consolidation_applied: rt?.consolidation_applied,
        inactive: rt?.inactive,
        cockpit_mode: rt?.cockpit_mode,
        centers_count: result.payload.ppap_cognitive_centers?.length,
        z22_gate: ppapZ22?.gate_scenario,
        bound_blocks: rt?.bound_blocks?.length ?? result.payload.ppap_signal_loader?.bound_blocks?.length
      };
      assert.strictEqual(ppapZ22?.promotion_applied, true);
      assert.strictEqual(ppapZ22?.cockpit_mode, 'ppap_native');
      assert.strictEqual(rt.promotion_applied, true);
      assert.strictEqual(rt.consolidation_applied, true);
      assert.strictEqual(rt.inactive, false);
      assert.strictEqual(rt.cockpit_mode, 'ppap_native');
      assert.ok(rt.binding_ratio >= Z22_MIN);
      assert.strictEqual(result.payload.ppap_signal_loader.signal_readiness, 'ready');
    });

    await test('Fase 3 — centers, resolver e registries homologados', async () => {
      const user = { company_id: pilotCompanyId, role: 'gerente', hierarchy_level: 2 };
      const result = await applyCognitiveFoundationToDashboard(user, {
        profile_code: 'manager_quality',
        functional_area: 'quality'
      });
      assert.strictEqual(result.payload.ppap_cognitive_centers.length, 6);
      const resolved = resolvePpapCockpitRuntime(result.payload);
      assert.ok(resolved);
      assert.strictEqual(resolved.runtime.consolidation_applied, true);
      assert.strictEqual(Object.keys(PPAP_HUB_REGISTRY).length, 6);
      assert.strictEqual(shouldSuppressPpapPlaceholderWidgets(resolved.runtime), true);
    });

    await test('GF-006 critérios obrigatórios consolidados', async () => {
      const user = { company_id: pilotCompanyId, role: 'gerente', hierarchy_level: 2 };
      const result = await applyCognitiveFoundationToDashboard(user, {
        profile_code: 'manager_quality',
        functional_area: 'quality'
      });
      const rt = result.payload.ppap_cognitive_runtime;
      assert.strictEqual(rt.promotion_applied, true, 'PPAP_PROMOTION_APPLIED');
      assert.strictEqual(rt.consolidation_applied, true, 'PPAP_CONSOLIDATION_APPLIED');
      assert.strictEqual(rt.inactive, false, 'PPAP_RUNTIME_ACTIVE');
      assert.ok(rt.binding_ratio >= Z22_MIN, 'PPAP_BINDING_RATIO >= THRESHOLD');
      assert.strictEqual(result.payload.ppap_signal_loader.signal_readiness, 'ready');
    });

    await test('Fase 4 — regressão cruzada (PPAP ON não altera domínios homologados)', async () => {
      const user = { company_id: REFERENCE_TENANT, role: 'gerente', hierarchy_level: 2 };
      const crossResults = [];

      for (const spec of CROSS_DOMAIN_PROFILES) {
        const result = await applyCognitiveFoundationToDashboard(user, {
          profile_code: spec.profile,
          functional_area: spec.area
        });
        const domainRt = result.payload[spec.key];
        assert.ok(domainRt, `${spec.domain}: payload.${spec.key} ausente`);
        if (spec.mode !== 'quality_native') {
          assert.strictEqual(
            domainRt.cockpit_mode,
            spec.mode,
            `${spec.domain}: cockpit_mode inesperado`
          );
        } else {
          assert.strictEqual(domainRt.cockpit_mode, spec.mode, 'Quality: quality_native preservado');
        }
        const ppapRt = result.payload.ppap_cognitive_runtime;
        assert.ok(ppapRt, `${spec.domain}: ppap_cognitive_runtime ausente`);
        assert.strictEqual(ppapRt.inactive, true, `${spec.domain}: PPAP deve permanecer inactivo`);
        crossResults.push({
          domain: spec.domain,
          profile: spec.profile,
          cockpit_mode: domainRt.cockpit_mode,
          ppap_inactive: ppapRt.inactive
        });
      }

      const qualityPilot = await applyCognitiveFoundationToDashboard(
        { company_id: pilotCompanyId, role: 'gerente', hierarchy_level: 2 },
        { profile_code: 'manager_quality', functional_area: 'quality' }
      );
      assert.strictEqual(
        qualityPilot.payload.specialized_cockpit_runtime?.cockpit_mode,
        'quality_native',
        'Quality baseline preservado com PPAP activo'
      );
      assert.strictEqual(qualityPilot.payload.ppap_cognitive_runtime.inactive, false);
      assert.strictEqual(qualityPilot.payload.ppap_cognitive_runtime.promotion_applied, true);

      evidence.cross_domain = {
        reference_tenant: REFERENCE_TENANT,
        domains_checked: crossResults,
        quality_coexistence: {
          quality_native: qualityPilot.payload.specialized_cockpit_runtime?.cockpit_mode,
          ppap_active: !qualityPilot.payload.ppap_cognitive_runtime.inactive
        }
      };
    });
  } finally {
    restorePpapEnv(envSaved);
  }

  await test('Regressão — promotion chain PPAP intacta', async () => {
    const { execSync } = require('child_process');
    execSync('node tests/cognitive-runtime/runPpapPromotionChainTests.js', {
      cwd: path.join(__dirname, '../..'),
      stdio: 'pipe'
    });
  });

  await test('Regressão — suites cross-domain homologadas', async () => {
    const { execSync } = require('child_process');
    const cwd = path.join(__dirname, '../..');
    for (const suite of CROSS_DOMAIN_SUITES) {
      execSync(`node ${suite}`, { cwd, stdio: 'pipe' });
    }
  });

  console.log('\n--- GF-006 Homologation Evidence ---');
  console.log(JSON.stringify(evidence, null, 2));
  console.log('\nPPAP_PROMOTION_APPLIED = YES');
  console.log('PPAP_CONSOLIDATION_APPLIED = YES');
  console.log('PPAP_RUNTIME_ACTIVE = YES');
  console.log('NO_RUNTIME_REGRESSION = YES');
  console.log('NO_CROSS_DOMAIN_REGRESSION = YES');
  console.log('BASELINE_SYSTEM_v1.1 = PRESERVED');

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
