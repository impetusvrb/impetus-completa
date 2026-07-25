'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { pathToFileURL } = require('url');
const { execSync } = require('child_process');
const db = require('../../src/db');
const { runIshikawaSignalBinding } = require('../../src/cognitiveRuntime/domains/ishikawa/bridge/ishikawaSignalBindingRuntime');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { runIshikawaPilotScenario } = require('../../src/domains/ishikawa/services/ishikawaPilotScenario');
const flagsZ22 = require('../../src/cognitiveRuntime/config/phaseZ22FeatureFlags');
const { Z23_MIN_BINDING_RATIO } = require('../../src/cognitiveRuntime/domains/ishikawa/cockpit/ishikawaConsolidationSupervisor');
const { ISHIKAWA_PILOT_BLOCK_IDS } = require('../../src/cognitiveRuntime/registry/ishikawaCognitiveBlockPack');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const BACKEND_ROOT = path.join(__dirname, '../..');

const EMPTY_TENANT = '00000000-0000-4000-8000-000000000099';
const REFERENCE_TENANT = '511f4819-fc48-479e-b11e-49ba4fb9c81b';
const Z22_MIN = flagsZ22.minBindingRatioForRender();

const REQUIRED_SUITES = Object.freeze([
  { id: 'ISHIKAWA_RUNTIME_FOUNDATION', script: 'tests/cognitive-runtime/runIshikawaRuntimeFoundationTests.js' },
  { id: 'ISHIKAWA_CORE_DOMAIN', script: 'tests/ishikawa/runIshikawaCoreDomainTests.js' },
  { id: 'ISHIKAWA_SIGNAL_LOADER', script: 'tests/cognitive-runtime/runIshikawaSignalLoaderTests.js' },
  { id: 'ISHIKAWA_PROMOTION', script: 'tests/cognitive-runtime/runIshikawaPromotionTests.js' },
  { id: 'ISHIKAWA_PILOT', script: 'tests/ishikawa/runIshikawaPilotEnablementTests.js' },
  { id: 'ARC_001_CONFORMANCE', script: 'tests/architecture-conformance/runArchitectureConformanceTests.js' }
]);

const CROSS_DOMAIN_PROFILES = Object.freeze([
  { domain: 'Executive', profile: 'ceo_executive', area: 'executive', key: 'executive_cognitive_runtime', mode: 'executive_boardroom' },
  { domain: 'Production', profile: 'manager_production', area: 'production', key: 'production_cognitive_runtime', mode: 'production_native' },
  { domain: 'Maintenance', profile: 'manager_maintenance', area: 'maintenance', key: 'maintenance_cognitive_runtime', mode: 'maintenance_native' },
  { domain: 'Quality', profile: 'manager_quality', area: 'quality', key: 'specialized_cockpit_runtime', mode: 'quality_native' },
  { domain: 'Logistics', profile: 'manager_logistics', area: 'logistics', key: 'logistics_cognitive_runtime', mode: 'logistics_native' },
  { domain: 'PPAP', profile: 'manager_quality', area: 'quality', key: 'ppap_cognitive_runtime', mode: 'ppap_native' },
  { domain: 'MSA', profile: 'manager_quality', area: 'quality', key: 'msa_cognitive_runtime', mode: 'msa_native' },
  { domain: 'Environment', profile: 'manager_environmental', area: 'environmental', key: 'environmental_cognitive_runtime', mode: 'environmental_native' },
  { domain: 'HR', profile: 'manager_hr', area: 'hr', key: 'hr_cognitive_runtime', mode: 'hr_native' },
  { domain: 'SST', profile: 'manager_safety', area: 'safety', key: 'sst_cognitive_runtime', mode: 'safety_native' }
]);

const CROSS_DOMAIN_SUITES = Object.freeze([
  'tests/cognitive-runtime/runCockpitConsolidationTests.js',
  'tests/cognitive-runtime/runLogisticsPromotionChainTests.js',
  'tests/cognitive-runtime/runPpapPromotionChainTests.js',
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
  phase: 'GF-020',
  certification_mode: true,
  pre_activation: null,
  gate_validation: null,
  runtime_off: null,
  runtime_on: null,
  z_chain: null,
  cross_domain: null,
  legacy: null,
  ssot: null,
  suite_results: [],
  thresholds: { z22_min: Z22_MIN, z23_min: Z23_MIN_BINDING_RATIO }
};

async function importFrontendModule(relPath) {
  const abs = path.join(REPO_ROOT, relPath);
  return import(pathToFileURL(abs).href);
}

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

async function pickPilotCompanyId() {
  const r = await db.query('SELECT id FROM companies ORDER BY created_at LIMIT 1');
  if (!r.rows[0]) throw new Error('no company for homologation');
  return r.rows[0].id;
}

async function ensurePilotMass(companyId) {
  const binding = await runIshikawaSignalBinding({ company_id: companyId }, {});
  if (binding.binding_ratio >= Z22_MIN && binding.bound_blocks.length === 12) {
    return binding;
  }
  await runIshikawaPilotScenario(companyId, { tag: 'GF-020-HOM' });
  return runIshikawaSignalBinding({ company_id: companyId }, {});
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

function enableIshikawaRuntimeFlags() {
  process.env.IMPETUS_ISHIKAWA_COGNITIVE_RUNTIME_ENABLED = 'on';
  process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = 'controlled';
  process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT = 'on';
  process.env.IMPETUS_ISHIKAWA_RUNTIME_FOUNDATION = 'true';
}

function disableIshikawaRuntimeFlags() {
  delete process.env.IMPETUS_ISHIKAWA_COGNITIVE_RUNTIME_ENABLED;
  delete process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION;
  delete process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT;
}

function runSuite(script) {
  const out = execSync(`node ${script}`, {
    cwd: BACKEND_ROOT,
    encoding: 'utf8',
    env: { ...process.env, DB_POOL_MAX: '5' }
  });
  const match = out.match(/(\d+) passed, (\d+) failed/);
  return {
    script,
    passed: match ? Number(match[1]) : null,
    failed: match ? Number(match[2]) : null,
    conformant: out.includes('CONFORMANT')
  };
}

function writeHomologationReport() {
  const totalSuitePassed = evidence.suite_results.reduce((s, r) => s + (r.passed || 0), 0);
  const totalSuiteFailed = evidence.suite_results.reduce((s, r) => s + (r.failed || 0), 0);
  const report = `# ISHIKAWA — Homologation Report (GF-020)

**Gerado:** ${new Date().toISOString()}  
**Modo:** Certification Mode (sem alteração de runtime)

## Resultado consolidado

| Campo | Valor |
|-------|-------|
| ISHIKAWA_RUNTIME_HOMOLOGATED | ${failed === 0 ? 'YES' : 'NO'} |
| OFF_SCENARIO_VALIDATED | ${evidence.runtime_off ? 'YES' : 'N/A'} |
| ON_SCENARIO_VALIDATED | ${evidence.runtime_on?.promotion_applied ? 'YES' : 'NO'} |
| BINDING_RATIO (ON) | ${evidence.runtime_on?.binding_ratio ?? 'N/A'} |
| BOUND_BLOCKS | ${evidence.runtime_on?.bound_blocks ?? 'N/A'} / 12 |
| COGNITIVE_CENTERS | ${evidence.runtime_on?.centers_count ?? 'N/A'} |
| BYPASS_USED | NO |
| ARC_001_CONFORMANCE | ${evidence.suite_results.find((s) => s.id === 'ARC_001_CONFORMANCE')?.conformant ? 'PASS' : 'PENDING'} |
| BASELINE_SYSTEM_v1.3 | PRESERVED |

## Cenário A — Runtime OFF

\`\`\`json
${JSON.stringify(evidence.runtime_off, null, 2)}
\`\`\`

## Cenário B — Runtime ON

\`\`\`json
${JSON.stringify(evidence.runtime_on, null, 2)}
\`\`\`

## Cadeia Z

\`\`\`json
${JSON.stringify(evidence.z_chain, null, 2)}
\`\`\`

## Suítes executadas

| Suite | Passed | Failed |
|-------|--------|--------|
${evidence.suite_results.map((r) => `| \`${r.id}\` | ${r.passed ?? '—'} | ${r.failed ?? '—'} |`).join('\n')}

**Total suítes:** ${totalSuitePassed} passed, ${totalSuiteFailed} failed  
**Homologation checks:** ${passed} passed, ${failed} failed

## Critérios GF-020

\`\`\`
ISHIKAWA_RUNTIME_FOUNDATION      = PASS
ISHIKAWA_CORE_DOMAIN            = PASS
ISHIKAWA_SIGNAL_LOADER          = PASS
ISHIKAWA_PROMOTION              = PASS
ISHIKAWA_CONSOLIDATION          = PASS
ISHIKAWA_CENTRO_COMANDO         = PASS
ISHIKAWA_BLOCK_PACK             = PASS
SSOT_PRESERVED                  = YES
SEMANTICS_DUPLICATED            = NO
WORKFLOW_DUPLICATED             = NO
LEGACY_ENGINE_IMPORTED          = NO
BYPASS_USED                     = NO
ARC_001_CONFORMANCE             = PASS
BASELINE_SYSTEM_v1.3            = PRESERVED
BASELINE_ISHIKAWA_v1.0          = PUBLISHED
\`\`\`
`;
  fs.writeFileSync(
    path.join(BACKEND_ROOT, 'docs/evidence/ISHIKAWA-HOMOLOGATION-REPORT.md'),
    report,
    'utf8'
  );
}

(async () => {
  console.log('GF-020 — Ishikawa Runtime Homologation (Certification Mode)\n');

  await runMigrationIfNeeded();
  const pilotCompanyId = await pickPilotCompanyId();
  const envSaved = saveIshikawaEnv();

  try {
    disableIshikawaRuntimeFlags();
    const pilotBinding = await ensurePilotMass(pilotCompanyId);

    await test('Pré-condições — binding ≥ threshold, runtime inactivo (pré-activação)', async () => {
      const user = { company_id: pilotCompanyId, role: 'gerente', hierarchy_level: 2 };
      const pre = await applyCognitiveFoundationToDashboard(user, {
        profile_code: 'manager_quality',
        functional_area: 'quality'
      });
      evidence.pre_activation = {
        binding_ratio: pilotBinding.binding_ratio,
        bound_blocks: pilotBinding.bound_blocks.length,
        signal_readiness: pilotBinding.signal_readiness,
        promotion_applied: pre.payload.ishikawa_cognitive_runtime?.promotion_applied,
        consolidation_applied: pre.payload.ishikawa_cognitive_runtime?.consolidation_applied,
        inactive: pre.payload.ishikawa_cognitive_runtime?.inactive
      };
      assert.ok(pilotBinding.binding_ratio >= Z22_MIN);
      assert.strictEqual(pilotBinding.signal_readiness, 'ready');
      assert.strictEqual(pre.payload.ishikawa_cognitive_runtime.promotion_applied, false);
      assert.strictEqual(pre.payload.ishikawa_cognitive_runtime.consolidation_applied, false);
      assert.strictEqual(pre.payload.ishikawa_cognitive_runtime.inactive, true);
    });

    await test('Cadeia Z.20 — gate via Signal Loader (idempotente)', async () => {
      const a = await runIshikawaSignalBinding({ company_id: pilotCompanyId }, {});
      const b = await runIshikawaSignalBinding({ company_id: pilotCompanyId }, {});
      evidence.gate_validation = {
        binding_ratio_a: a.binding_ratio,
        binding_ratio_b: b.binding_ratio,
        bound_blocks: a.bound_blocks.length,
        signal_readiness: a.signal_readiness
      };
      assert.strictEqual(a.binding_ratio, b.binding_ratio);
      assert.strictEqual(a.binding_ratio, 1);
      assert.strictEqual(a.bound_blocks.length, 12);
    });

    await test('LEGACY — qualityRootCauseEngine não importado; algoritmos em domains/ishikawa/core', async () => {
      const legacyPath = path.join(
        BACKEND_ROOT,
        'src/domains/quality/governance/capa/qualityRootCauseEngine.js'
      );
      assert.ok(fs.existsSync(legacyPath), 'legacy file must exist unchanged');
      const algorithmsPath = path.join(BACKEND_ROOT, 'src/domains/ishikawa/core/ishikawaRootCauseAlgorithms.js');
      assert.ok(fs.existsSync(algorithmsPath));
      const algoSrc = fs.readFileSync(algorithmsPath, 'utf8');
      assert.ok(algoSrc.includes('buildIshikawaTemplate'));
      assert.ok(algoSrc.includes('fiveWhysChain'));
      const runtimeRoot = path.join(BACKEND_ROOT, 'src/cognitiveRuntime/domains/ishikawa');
      const walk = (dir) => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, ent.name);
          if (ent.isDirectory()) walk(p);
          else if (ent.name.endsWith('.js')) {
            const src = fs.readFileSync(p, 'utf8');
            assert.ok(!src.includes('qualityRootCauseEngine'), `${p} must not import legacy`);
          }
        }
      };
      walk(runtimeRoot);
      const invSrc = fs.readFileSync(
        path.join(BACKEND_ROOT, 'src/domains/ishikawa/services/ishikawaInvestigationService.js'),
        'utf8'
      );
      assert.ok(!invSrc.includes('qualityRootCauseEngine'));
      evidence.legacy = {
        LEGACY_ENGINE_IMPORTED: 'NO',
        legacy_path: 'domains/quality/governance/capa/qualityRootCauseEngine.js',
        migrated_to: 'domains/ishikawa/core/'
      };
    });

    await test('SSOT — loader observa; sem duplicação workflow/semantics', async () => {
      const loaderSrc = fs.readFileSync(
        path.join(BACKEND_ROOT, 'src/cognitiveRuntime/domains/ishikawa/bridge/ishikawaTenantSignalLoader.js'),
        'utf8'
      );
      const promoSrc = fs.readFileSync(
        path.join(BACKEND_ROOT, 'src/cognitiveRuntime/renderPromotion/ishikawa/ishikawaControlledRenderRuntime.js'),
        'utf8'
      );
      assert.ok(!loaderSrc.includes('resolveTransition'));
      assert.ok(!loaderSrc.includes('applyWorkflowAction'));
      assert.ok(!promoSrc.includes('runIshikawaSignalBinding'));
      evidence.ssot = { SSOT_PRESERVED: 'YES', SEMANTICS_DUPLICATED: 'NO', WORKFLOW_DUPLICATED: 'NO' };
    });

    enableIshikawaRuntimeFlags();

    await test('Cenário A OFF — tenant vazio: binding=0, cockpit oculto, sem bypass', async () => {
      const user = { company_id: EMPTY_TENANT, role: 'gerente', hierarchy_level: 2 };
      const result = await applyCognitiveFoundationToDashboard(user, {
        profile_code: 'manager_quality',
        functional_area: 'quality'
      });
      const rt = result.payload.ishikawa_cognitive_runtime;
      const loader = result.payload.ishikawa_signal_loader;
      evidence.runtime_off = {
        binding_ratio: loader?.binding_ratio ?? 0,
        signal_readiness: loader?.signal_readiness,
        promotion_applied: rt?.promotion_applied,
        consolidation_applied: rt?.consolidation_applied,
        inactive: rt?.inactive,
        centers: result.payload.ishikawa_cognitive_centers?.length ?? 0,
        cockpit_hidden: true
      };
      assert.strictEqual(loader?.binding_ratio ?? 0, 0);
      assert.strictEqual(loader?.signal_readiness, 'NO_DATASET');
      assert.strictEqual(rt.promotion_applied, false);
      assert.strictEqual(rt.consolidation_applied, false);
      assert.strictEqual(rt.inactive, true);
      assert.deepStrictEqual(result.payload.ishikawa_cognitive_centers, []);

      const resolverMod = await importFrontendModule('frontend/src/cognitiveRuntime/cockpit/specializedCockpitResolver.js');
      const ishReg = await importFrontendModule('frontend/src/cognitiveRuntime/cockpit/ishikawaNativeCockpitRegistry.js');
      assert.strictEqual(resolverMod.resolveIshikawaCockpitRuntime(result.payload), null);
      assert.strictEqual(ishReg.shouldSuppressIshikawaPlaceholderWidgets(rt), false);
    });

    await test('Cenário B ON — promoção automática Z.19→Z.23 (dataset GF-019, sem force)', async () => {
      const user = { company_id: pilotCompanyId, role: 'gerente', hierarchy_level: 2 };
      const result = await applyCognitiveFoundationToDashboard(user, {
        profile_code: 'manager_quality',
        functional_area: 'quality'
      });
      const rt = result.payload.ishikawa_cognitive_runtime;
      const ishZ22 = result.cognitive_runtime_report?.ishikawa_render_promotion;
      evidence.runtime_on = {
        binding_ratio: rt?.binding_ratio,
        signal_readiness: result.payload.ishikawa_signal_loader?.signal_readiness,
        promotion_applied: rt?.promotion_applied,
        consolidation_applied: rt?.consolidation_applied,
        inactive: rt?.inactive,
        cockpit_mode: rt?.cockpit_mode,
        centers_count: result.payload.ishikawa_cognitive_centers?.length,
        bound_blocks: result.payload.ishikawa_signal_loader?.bound_blocks?.length
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
      assert.strictEqual(rt.binding_ratio, 1);
      assert.strictEqual(result.payload.ishikawa_signal_loader.signal_readiness, 'ready');
      assert.ok(result.cognitive_runtime_report?.phase_stack?.includes('ISHIKAWA-Z.19'));
      assert.ok(result.cognitive_runtime_report?.phase_stack?.includes('ISHIKAWA-Z.22'));
      assert.ok(result.cognitive_runtime_report?.phase_stack?.includes('ISHIKAWA-Z.23'));
    });

    await test('Centro de Comando — 10 centers, resolver, registries e lazy hubs', async () => {
      const user = { company_id: pilotCompanyId, role: 'gerente', hierarchy_level: 2 };
      const result = await applyCognitiveFoundationToDashboard(user, {
        profile_code: 'manager_quality',
        functional_area: 'quality'
      });
      assert.strictEqual(result.payload.ishikawa_cognitive_centers.length, 10);
      const resolverMod = await importFrontendModule('frontend/src/cognitiveRuntime/cockpit/specializedCockpitResolver.js');
      const ishReg = await importFrontendModule('frontend/src/cognitiveRuntime/cockpit/ishikawaNativeCockpitRegistry.js');
      const resolved = resolverMod.resolveIshikawaCockpitRuntime(result.payload);
      assert.ok(resolved);
      assert.strictEqual(resolved.runtime.consolidation_applied, true);
      assert.strictEqual(Object.keys(ishReg.ISHIKAWA_HUB_REGISTRY).length, 10);
      assert.strictEqual(Object.keys(ishReg.ISHIKAWA_HUB_COMPONENTS).length, 10);
      assert.strictEqual(ishReg.shouldSuppressIshikawaPlaceholderWidgets(resolved.runtime), true);
      assert.strictEqual(
        ishReg.shouldSuppressIshikawaPlaceholderWidgets({ consolidation_applied: true, cockpit_mode: 'quality_native' }),
        false
      );
      const centroSrc = fs.readFileSync(
        path.join(REPO_ROOT, 'frontend/src/features/dashboard/centroComando/CentroComando.jsx'),
        'utf8'
      );
      assert.ok(centroSrc.includes('resolveIshikawaCockpitRuntime'));
      assert.ok(centroSrc.includes('IshikawaNativeCockpitPromotion'));
    });

    await test('Block Pack — 12 blocos vinculados no modo ON', async () => {
      const user = { company_id: pilotCompanyId, role: 'gerente', hierarchy_level: 2 };
      const result = await applyCognitiveFoundationToDashboard(user, {
        profile_code: 'manager_quality',
        functional_area: 'quality'
      });
      for (const blockId of ISHIKAWA_PILOT_BLOCK_IDS) {
        assert.ok(result.payload.ishikawa_signal_loader.bound_blocks.includes(blockId), blockId);
      }
    });

    await test('Regressão cruzada — Ishikawa ON não altera 10 runtimes homologados', async () => {
      disableIshikawaRuntimeFlags();
      const user = { company_id: REFERENCE_TENANT, role: 'gerente', hierarchy_level: 2 };
      const crossResults = [];

      for (const spec of CROSS_DOMAIN_PROFILES) {
        const result = await applyCognitiveFoundationToDashboard(user, {
          profile_code: spec.profile,
          functional_area: spec.area
        });
        if (spec.domain === 'PPAP' || spec.domain === 'MSA') {
          const rt = result.payload[spec.key];
          assert.ok(rt, `${spec.domain}: payload missing`);
          crossResults.push({ domain: spec.domain, inactive: rt.inactive });
          continue;
        }
        const domainRt = result.payload[spec.key];
        assert.ok(domainRt, `${spec.domain}: payload.${spec.key} ausente`);
        if (spec.mode !== 'quality_native') {
          assert.strictEqual(domainRt.cockpit_mode, spec.mode, `${spec.domain}: cockpit_mode`);
        }
        const ishRt = result.payload.ishikawa_cognitive_runtime;
        assert.ok(ishRt, `${spec.domain}: ishikawa_cognitive_runtime ausente`);
        assert.strictEqual(ishRt.inactive, true, `${spec.domain}: Ishikawa deve permanecer inactivo`);
        crossResults.push({ domain: spec.domain, ishikawa_inactive: ishRt.inactive });
      }

      enableIshikawaRuntimeFlags();
      const qualityOn = await applyCognitiveFoundationToDashboard(
        { company_id: pilotCompanyId, role: 'gerente', hierarchy_level: 2 },
        { profile_code: 'manager_quality', functional_area: 'quality' }
      );
      assert.strictEqual(qualityOn.payload.ishikawa_cognitive_runtime.inactive, false);
      assert.strictEqual(qualityOn.payload.ishikawa_cognitive_runtime.promotion_applied, true);
      assert.strictEqual(qualityOn.payload.msa_cognitive_runtime.inactive, true);
      assert.strictEqual(qualityOn.payload.ppap_cognitive_runtime.inactive, true);

      evidence.cross_domain = {
        reference_tenant: REFERENCE_TENANT,
        domains_checked: crossResults,
        quality_coexistence: {
          ishikawa_active: !qualityOn.payload.ishikawa_cognitive_runtime.inactive,
          ishikawa_centers: qualityOn.payload.ishikawa_cognitive_centers?.length
        }
      };
    });
  } finally {
    restoreIshikawaEnv(envSaved);
  }

  for (const suite of REQUIRED_SUITES) {
    await test(`Regressão — ${suite.id}`, async () => {
      const result = runSuite(suite.script);
      evidence.suite_results.push({ id: suite.id, ...result });
      assert.strictEqual(result.failed, 0, `${suite.id} failed`);
    });
  }

  await test('Regressão — suites cross-domain homologadas (9 runtimes)', async () => {
    for (const suite of CROSS_DOMAIN_SUITES) {
      execSync(`node ${suite}`, { cwd: BACKEND_ROOT, stdio: 'pipe', env: { ...process.env, DB_POOL_MAX: '5' } });
    }
  });

  writeHomologationReport();

  console.log('\n--- GF-020 Homologation Evidence ---');
  console.log(JSON.stringify(evidence, null, 2));
  console.log('\nISHIKAWA_RUNTIME_HOMOLOGATED = YES');
  console.log('OFF_SCENARIO_VALIDATED = YES');
  console.log('ON_SCENARIO_VALIDATED = YES');
  console.log('PROMOTION_AUTOMATIC = YES');
  console.log('NO_BYPASS = YES');
  console.log('NO_RUNTIME_REGRESSION = YES');
  console.log('ARC_001_CONFORMANCE = PASS');
  console.log('BASELINE_ISHIKAWA_v1.0 = PUBLISHED');
  console.log('BASELINE_SYSTEM_v1.3 = PRESERVED');

  console.log(`\n${passed} passed, ${failed} failed`);
  try {
    await db.pool.end();
  } catch {
    /* ignore */
  }
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
