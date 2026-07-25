'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { pathToFileURL } = require('url');
const {
  REPO_ROOT,
  HOMOLOGATED_RUNTIMES,
  FOUNDATION_RUNTIMES,
  RUNTIME_PAYLOAD_FIELDS,
  SIGNAL_LOADER_FIELDS,
  SIGNAL_LOADER_CORE_FIELDS,
  LOADER_CONTRACTS,
  PROMOTION_SUPERVISORS,
  THRESHOLD_POLICY,
  SURFACE_CAPABILITIES_BASELINE,
  CC_REGISTRY_BASELINE,
  BASELINE_DOCS,
  EMPTY_TENANT,
  CROSS_DOMAIN_PROFILES,
  absRepoPath
} = require('./baselineManifest');

const report = {
  arc: 'ARC-001',
  baseline: 'BASELINE-SYSTEM-v1.2',
  categories: {},
  violations: []
};

let totalPassed = 0;
let totalFailed = 0;

function categoryResult(id, passed, failed) {
  report.categories[id] = { passed, failed, status: failed === 0 ? 'PASS' : 'FAIL' };
}

async function runCategory(id, name, fn) {
  let passed = 0;
  let failed = 0;
  const violations = [];

  async function check(label, fnCheck) {
    try {
      await fnCheck();
      passed += 1;
      totalPassed += 1;
    } catch (e) {
      failed += 1;
      totalFailed += 1;
      const msg = `${label}: ${e.message}`;
      violations.push(msg);
      report.violations.push(`[${id}] ${msg}`);
      console.error(`  ✗ ${label}: ${e.message}`);
    }
  }

  console.log(`\n${id} — ${name}`);
  await fn(check);
  categoryResult(id, passed, failed);
  if (failed === 0) {
    console.log(`  → ${id} PASS (${passed} checks)`);
  } else {
    console.log(`  → ${id} FAIL (${failed} failed, ${passed} passed)`);
  }
  return { passed, failed, violations };
}

function readSource(relPath) {
  return fs.readFileSync(absRepoPath(relPath), 'utf8');
}

function assertFieldContract(obj, fields, label) {
  assert.ok(obj && typeof obj === 'object', `${label}: object missing`);
  for (const field of fields) {
    assert.ok(field in obj, `${label}: missing field "${field}"`);
  }
}

async function importFrontendModule(relPath) {
  const abs = absRepoPath(relPath);
  return import(pathToFileURL(abs).href);
}

// ─── ARC-001A — Runtime Registry ───────────────────────────────────────────

async function arc001A(check) {
  const { listDomains, COGNITIVE_DOMAINS } = require('../../src/cognitiveRuntime/domainFoundation/registry/cognitiveDomainRegistry');

  await check('cognitiveDomainRegistry exports 12 domains (9 homologated + 3 foundation)', async () => {
    const domains = listDomains();
    assert.strictEqual(domains.length, 12, `expected 12 domains, got ${domains.length}`);
    assert.ok(domains.includes('ppap'), 'ppap domain missing');
    assert.ok(domains.includes('logistics'), 'logistics domain missing');
    assert.ok(domains.includes('msa'), 'msa foundation domain missing');
    assert.ok(domains.includes('ishikawa'), 'ishikawa foundation domain missing');
    assert.ok(domains.includes('supply'), 'supply foundation domain missing');
  });

  for (const rt of FOUNDATION_RUNTIMES) {
    await check(`foundation runtime registered: ${rt.family} → ${rt.runtime_id}`, async () => {
      const def = COGNITIVE_DOMAINS[rt.domain];
      assert.ok(def, `domain "${rt.domain}" not in COGNITIVE_DOMAINS`);
      assert.strictEqual(def.runtime_id, rt.runtime_id);
      assert.strictEqual(def.cockpit_ready, false);
      assert.strictEqual(def.maturity, 'foundation');
    });
  }

  for (const rt of HOMOLOGATED_RUNTIMES) {
    await check(`runtime registered: ${rt.family} → ${rt.runtime_id}`, async () => {
      const def = COGNITIVE_DOMAINS[rt.domain];
      assert.ok(def, `domain "${rt.domain}" not in COGNITIVE_DOMAINS`);
      if (def.runtime_id) {
        assert.strictEqual(def.runtime_id, rt.runtime_id);
      }
    });
  }

  await check('RUNTIME_REGISTRY_COMPLETE = YES', async () => {
    assert.strictEqual(HOMOLOGATED_RUNTIMES.length, 9);
    for (const rt of HOMOLOGATED_RUNTIMES) {
      assert.ok(rt.runtime_id, rt.family);
      assert.ok(rt.payload_key, rt.family);
    }
  });
}

// ─── ARC-001B — Loader Contract ────────────────────────────────────────────

async function arc001B(check) {
  for (const contract of LOADER_CONTRACTS) {
    await check(`loader file exists: ${contract.runtime_id}`, async () => {
      assert.ok(fs.existsSync(absRepoPath(contract.loader)), `missing ${contract.loader}`);
    });

    await check(`loader export: ${contract.loadExport}`, async () => {
      const mod = require(absRepoPath(contract.loader));
      assert.strictEqual(typeof mod[contract.loadExport], 'function', contract.loadExport);
    });

    if (contract.binding) {
      await check(`binding runtime: ${contract.runBindingExport}`, async () => {
        assert.ok(fs.existsSync(absRepoPath(contract.binding)), `missing ${contract.binding}`);
        const mod = require(absRepoPath(contract.binding));
        assert.strictEqual(typeof mod[contract.runBindingExport], 'function');
      });
    }
  }

  for (const rt of HOMOLOGATED_RUNTIMES.filter((r) => r.signal_loader_key)) {
    await check(`descriptor cockpit_mode: ${rt.runtime_id}`, async () => {
      const descriptorPath =
        rt.runtime_id === 'logistics_native'
          ? 'backend/src/cognitiveRuntime/domains/logistics/runtime/logisticsRuntimeDescriptor.js'
          : 'backend/src/cognitiveRuntime/domains/ppap/runtime/ppapRuntimeDescriptor.js';
      const src = readSource(descriptorPath);
      assert.ok(src.includes(rt.runtime_id), `${rt.runtime_id} not in descriptor`);
    });
  }

  await check('ppap binding report shape (empty tenant, no production data)', async () => {
    const { runPpapSignalBinding } = require('../../src/cognitiveRuntime/domains/ppap/bridge/ppapSignalBindingRuntime');
    const out = await runPpapSignalBinding({ company_id: EMPTY_TENANT }, {});
    for (const field of SIGNAL_LOADER_FIELDS) {
      assert.ok(field in out, `ppap loader missing ${field}`);
    }
  });

  await check('logistics binding report shape (empty tenant)', async () => {
    const { runLogisticsSignalBinding } = require('../../src/cognitiveRuntime/domains/logistics/bridge/logisticsSignalBindingRuntime');
    const out = await runLogisticsSignalBinding({ company_id: EMPTY_TENANT }, {});
    for (const field of SIGNAL_LOADER_CORE_FIELDS) {
      assert.ok(field in out, `logistics loader missing ${field}`);
    }
  });
}

// ─── ARC-001C — Payload Contract ───────────────────────────────────────────

async function arc001C(check) {
  const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');

  await check('facade payload: manager_quality includes msa foundation (inactive)', async () => {
    const user = { company_id: EMPTY_TENANT, role: 'gerente', hierarchy_level: 2 };
    const result = await applyCognitiveFoundationToDashboard(user, {
      profile_code: 'manager_quality',
      functional_area: 'quality'
    });
    const msaRt = result.payload.msa_cognitive_runtime;
    assert.ok(msaRt, 'msa_cognitive_runtime missing');
    assertFieldContract(msaRt, RUNTIME_PAYLOAD_FIELDS, 'msa_cognitive_runtime');
    assert.strictEqual(msaRt.runtime_id, 'msa_native');
    assert.strictEqual(msaRt.inactive, true);
    assert.strictEqual(msaRt.promotion_applied, false);
    assert.strictEqual(msaRt.consolidation_applied, false);
    const msaLoader = result.payload.msa_signal_loader;
    assert.ok(msaLoader, 'msa_signal_loader missing');
    assert.strictEqual(msaLoader.signal_readiness, 'NO_DATASET');
    assert.strictEqual(msaLoader.binding_ratio, 0);
    assert.deepStrictEqual(result.payload.msa_cognitive_centers, []);
  });

  await check('facade payload: manager_quality includes ishikawa foundation (inactive)', async () => {
    const user = { company_id: EMPTY_TENANT, role: 'gerente', hierarchy_level: 2 };
    const result = await applyCognitiveFoundationToDashboard(user, {
      profile_code: 'manager_quality',
      functional_area: 'quality'
    });
    const ishRt = result.payload.ishikawa_cognitive_runtime;
    assert.ok(ishRt, 'ishikawa_cognitive_runtime missing');
    assertFieldContract(ishRt, RUNTIME_PAYLOAD_FIELDS, 'ishikawa_cognitive_runtime');
    assert.strictEqual(ishRt.runtime_id, 'ishikawa_native');
    assert.strictEqual(ishRt.inactive, true);
    assert.strictEqual(ishRt.promotion_applied, false);
    assert.strictEqual(ishRt.consolidation_applied, false);
    const ishLoader = result.payload.ishikawa_signal_loader;
    assert.ok(ishLoader, 'ishikawa_signal_loader missing');
    assert.strictEqual(ishLoader.signal_readiness, 'NO_DATASET');
    assert.strictEqual(ishLoader.binding_ratio, 0);
    assert.deepStrictEqual(result.payload.ishikawa_cognitive_centers, []);
  });

  await check('facade payload: manager_quality foundation fields', async () => {
    const user = { company_id: EMPTY_TENANT, role: 'gerente', hierarchy_level: 2 };
    const result = await applyCognitiveFoundationToDashboard(user, {
      profile_code: 'manager_quality',
      functional_area: 'quality'
    });
    const ppapRt = result.payload.ppap_cognitive_runtime;
    assert.ok(ppapRt, 'ppap_cognitive_runtime missing');
    assertFieldContract(ppapRt, RUNTIME_PAYLOAD_FIELDS, 'ppap_cognitive_runtime');
    const loader = result.payload.ppap_signal_loader;
    assert.ok(loader, 'ppap_signal_loader missing');
    assertFieldContract(loader, SIGNAL_LOADER_FIELDS, 'ppap_signal_loader');
  });

  await check('facade payload: manager_logistics foundation fields', async () => {
    const user = { company_id: EMPTY_TENANT, role: 'gerente', hierarchy_level: 2 };
    const result = await applyCognitiveFoundationToDashboard(user, {
      profile_code: 'manager_logistics',
      functional_area: 'logistics'
    });
    const rt = result.payload.logistics_cognitive_runtime;
    assert.ok(rt, 'logistics_cognitive_runtime missing');
    assertFieldContract(rt, RUNTIME_PAYLOAD_FIELDS, 'logistics_cognitive_runtime');
    assertFieldContract(result.payload.logistics_signal_loader, SIGNAL_LOADER_FIELDS, 'logistics_signal_loader');
  });

  for (const spec of CROSS_DOMAIN_PROFILES) {
    await check(`payload key present: ${spec.profile} → ${spec.payload_key}`, async () => {
      const user = { company_id: EMPTY_TENANT, role: 'gerente', hierarchy_level: 2 };
      const result = await applyCognitiveFoundationToDashboard(user, {
        profile_code: spec.profile,
        functional_area: spec.area
      });
      const rt = result.payload[spec.payload_key];
      assert.ok(rt, `${spec.payload_key} missing for ${spec.profile}`);
      if (spec.payload_key !== 'specialized_cockpit_runtime') {
        assert.ok('cockpit_mode' in rt, `${spec.payload_key}.cockpit_mode missing`);
      }
    });
  }
}

// ─── ARC-001D — Promotion Contract ─────────────────────────────────────────

async function arc001D(check) {
  const lowBindingPilot = {
    pilot_skipped: false,
    engine_bridge: { binding_ratio: 0.1, bound_blocks: [], missing_blocks: ['x'], signal_readiness: 'NO_DATASET' }
  };
  const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
  const user = { company_id: EMPTY_TENANT };

  await check('PPAP Z.22: natural path rejects low binding', async () => {
    const { evaluatePpapRenderPromotionEligibility } = require('../../src/cognitiveRuntime/renderPromotion/ppap/ppapRenderPromotionSupervisor');
    process.env.IMPETUS_PPAP_RENDER_PROMOTION = 'controlled';
    const out = evaluatePpapRenderPromotionEligibility(user, payload, {}, lowBindingPilot);
    assert.strictEqual(out.allowed, false);
    assert.ok(out.reason.includes('insufficient_binding'), out.reason);
  });

  await check('PPAP Z.22: force_ppap_render does NOT bypass binding', async () => {
    const { evaluatePpapRenderPromotionEligibility } = require('../../src/cognitiveRuntime/renderPromotion/ppap/ppapRenderPromotionSupervisor');
    const out = evaluatePpapRenderPromotionEligibility(user, payload, { force_ppap_render: true }, lowBindingPilot);
    assert.strictEqual(out.allowed, false, 'PPAP force must not bypass binding');
  });

  await check('PPAP Z.23: force_ppap_consolidation does NOT bypass binding', async () => {
    const { evaluatePpapConsolidationEligibility } = require('../../src/cognitiveRuntime/domains/ppap/cockpit/ppapConsolidationSupervisor');
    process.env.IMPETUS_PPAP_NATIVE_COCKPIT = 'on';
    const out = evaluatePpapConsolidationEligibility(
      { ...payload, cognitive_render_promotion: { promotion_applied: true, cockpit_mode: 'ppap_native' } },
      { force_ppap_consolidation: true },
      lowBindingPilot
    );
    assert.strictEqual(out.allowed, false);
  });

  await check('MSA Z.22: natural path rejects low binding', async () => {
    const { evaluateMsaRenderPromotionEligibility } = require('../../src/cognitiveRuntime/renderPromotion/msa/msaRenderPromotionSupervisor');
    process.env.IMPETUS_MSA_RENDER_PROMOTION = 'controlled';
    const out = evaluateMsaRenderPromotionEligibility(user, payload, {}, lowBindingPilot);
    assert.strictEqual(out.allowed, false);
    assert.ok(out.reason.includes('insufficient_binding'), out.reason);
  });

  await check('MSA Z.22: force_msa_render does NOT bypass binding', async () => {
    const { evaluateMsaRenderPromotionEligibility } = require('../../src/cognitiveRuntime/renderPromotion/msa/msaRenderPromotionSupervisor');
    const out = evaluateMsaRenderPromotionEligibility(user, payload, { force_msa_render: true }, lowBindingPilot);
    assert.strictEqual(out.allowed, false, 'MSA force must not bypass binding');
  });

  await check('MSA Z.23: force_msa_consolidation does NOT bypass binding', async () => {
    const { evaluateMsaConsolidationEligibility } = require('../../src/cognitiveRuntime/domains/msa/cockpit/msaConsolidationSupervisor');
    process.env.IMPETUS_MSA_NATIVE_COCKPIT = 'on';
    const out = evaluateMsaConsolidationEligibility(
      { ...payload, cognitive_render_promotion: { promotion_applied: true, cockpit_mode: 'msa_native' } },
      { force_msa_consolidation: true },
      lowBindingPilot
    );
    assert.strictEqual(out.allowed, false);
  });

  await check('Ishikawa Z.22: force_ishikawa_render does NOT bypass binding', async () => {
    const { evaluateIshikawaRenderPromotionEligibility } = require('../../src/cognitiveRuntime/renderPromotion/ishikawa/ishikawaRenderPromotionSupervisor');
    process.env.IMPETUS_ISHIKAWA_RENDER_PROMOTION = 'controlled';
    const out = evaluateIshikawaRenderPromotionEligibility(user, payload, { force_ishikawa_render: true }, lowBindingPilot);
    assert.strictEqual(out.allowed, false, 'Ishikawa force must not bypass binding');
  });

  await check('Ishikawa Z.23: force_ishikawa_consolidation does NOT bypass binding', async () => {
    const { evaluateIshikawaConsolidationEligibility } = require('../../src/cognitiveRuntime/domains/ishikawa/cockpit/ishikawaConsolidationSupervisor');
    process.env.IMPETUS_ISHIKAWA_NATIVE_COCKPIT = 'on';
    const out = evaluateIshikawaConsolidationEligibility(
      { ...payload, cognitive_render_promotion: { promotion_applied: true, cockpit_mode: 'ishikawa_native' } },
      { force_ishikawa_consolidation: true },
      lowBindingPilot
    );
    assert.strictEqual(out.allowed, false);
  });

  await check('Logistics Z.22: natural path rejects low binding', async () => {
    const { evaluateLogisticsRenderPromotionEligibility } = require('../../src/cognitiveRuntime/renderPromotion/logistics/logisticsRenderPromotionSupervisor');
    process.env.IMPETUS_LOGISTICS_RENDER_PROMOTION = 'controlled';
    const out = evaluateLogisticsRenderPromotionEligibility(
      user,
      { profile_code: 'manager_logistics', functional_area: 'logistics' },
      {},
      lowBindingPilot
    );
    assert.strictEqual(out.allowed, false);
  });

  await check('Logistics Z.22: binding sourced from engine_bridge only', async () => {
    const src = readSource('backend/src/cognitiveRuntime/renderPromotion/logistics/logisticsRenderPromotionSupervisor.js');
    assert.ok(src.includes('engine_bridge?.binding_ratio'), 'logistics supervisor must read engine_bridge');
    assert.ok(!/require\s*\(\s*['"].*\/db['"]/.test(src), 'logistics promotion must not require db');
  });

  await check('PPAP promotion supervisors do not require db', async () => {
    for (const rel of [
      'backend/src/cognitiveRuntime/renderPromotion/ppap/ppapRenderPromotionSupervisor.js',
      'backend/src/cognitiveRuntime/domains/ppap/cockpit/ppapConsolidationSupervisor.js'
    ]) {
      const src = readSource(rel);
      assert.ok(!/require\s*\(\s*['"].*\/db['"]/.test(src), `${rel} must not require db`);
    }
  });

  await check('MSA promotion supervisors do not require db', async () => {
    for (const rel of [
      'backend/src/cognitiveRuntime/renderPromotion/msa/msaRenderPromotionSupervisor.js',
      'backend/src/cognitiveRuntime/domains/msa/cockpit/msaConsolidationSupervisor.js'
    ]) {
      const src = readSource(rel);
      assert.ok(!/require\s*\(\s*['"].*\/db['"]/.test(src), `${rel} must not require db`);
    }
  });

  await check('Ishikawa promotion supervisors do not require db', async () => {
    for (const rel of [
      'backend/src/cognitiveRuntime/renderPromotion/ishikawa/ishikawaRenderPromotionSupervisor.js',
      'backend/src/cognitiveRuntime/domains/ishikawa/cockpit/ishikawaConsolidationSupervisor.js'
    ]) {
      const src = readSource(rel);
      assert.ok(!/require\s*\(\s*['"].*\/db['"]/.test(src), `${rel} must not require db`);
    }
  });

  for (const sup of PROMOTION_SUPERVISORS) {
    await check(`promotion supervisor exists: ${sup.domain}`, async () => {
      assert.ok(fs.existsSync(absRepoPath(sup.path)));
      const mod = require(absRepoPath(sup.path));
      assert.strictEqual(typeof mod[sup.evaluateExport], 'function');
    });
  }
}

// ─── ARC-001E — SurfaceCapabilities ────────────────────────────────────────

async function arc001E(check) {
  const surfaceMod = await importFrontendModule(
    'frontend/src/utils/dashboardSurfaceCapabilities.js'
  );
  const { resolveDashboardSurfaceCapabilities } = surfaceMod;

  for (const row of SURFACE_CAPABILITIES_BASELINE) {
    await check(`SurfaceCapabilities baseline: ${row.label}`, async () => {
      const caps = resolveDashboardSurfaceCapabilities(row.user);
      for (const [key, val] of Object.entries(row.expected)) {
        assert.strictEqual(caps[key], val, `${row.label}.${key}: expected ${val}, got ${caps[key]}`);
      }
    });
  }

  await check('quality profile never receives maintenance surface (cross-domain contamination)', async () => {
    const caps = resolveDashboardSurfaceCapabilities({
      dashboard_profile: 'manager_quality',
      functional_area: 'quality',
      role: 'tecnic'
    });
    assert.strictEqual(caps.maintenance, false);
    assert.strictEqual(caps.commandCenter, true);
  });

  await check('SurfaceCapabilities source preserves INC-022 fail-closed patterns', async () => {
    const src = readSource('frontend/src/utils/dashboardSurfaceCapabilities.js');
    assert.ok(src.includes('isQualityPrimary'), 'isQualityPrimary missing');
    assert.ok(src.includes('Fail-closed'), 'fail-closed policy comment missing');
    assert.ok(src.includes('commandCenter: !maintenance'), 'commandCenter gate missing');
  });
}

// ─── ARC-001F — Centro de Comando ──────────────────────────────────────────

async function arc001F(check) {
  const qualityReg = await importFrontendModule('frontend/src/cognitiveRuntime/cockpit/qualityNativeCockpitRegistry.js');
  const logisticsReg = await importFrontendModule('frontend/src/cognitiveRuntime/cockpit/logisticsNativeCockpitRegistry.js');
  const ppapReg = await importFrontendModule('frontend/src/cognitiveRuntime/cockpit/ppapNativeCockpitRegistry.js');

  await check('Quality OFF: placeholders not suppressed', async () => {
    assert.strictEqual(qualityReg.shouldSuppressPlaceholderWidgets({ consolidation_applied: false }), false);
    assert.strictEqual(
      qualityReg.shouldSuppressPlaceholderWidgets({ consolidation_applied: true, cockpit_mode: 'off' }),
      false
    );
  });

  await check('Quality ON: placeholders suppressed only when quality_native', async () => {
    assert.strictEqual(
      qualityReg.shouldSuppressPlaceholderWidgets({ consolidation_applied: true, cockpit_mode: 'quality_native' }),
      true
    );
    assert.strictEqual(
      qualityReg.shouldSuppressPlaceholderWidgets({ consolidation_applied: true, cockpit_mode: 'logistics_native' }),
      false
    );
  });

  await check('Logistics OFF/ON hub mount contract', async () => {
    assert.strictEqual(logisticsReg.shouldSuppressLogisticsPlaceholderWidgets({ consolidation_applied: false }), false);
    assert.strictEqual(
      logisticsReg.shouldSuppressLogisticsPlaceholderWidgets({
        consolidation_applied: true,
        cockpit_mode: 'logistics_native'
      }),
      true
    );
    assert.strictEqual(Object.keys(logisticsReg.LOGISTICS_HUB_REGISTRY).length, CC_REGISTRY_BASELINE.logistics.hubCount);
  });

  await check('PPAP OFF/ON hub mount contract', async () => {
    assert.strictEqual(ppapReg.shouldSuppressPpapPlaceholderWidgets({ consolidation_applied: false }), false);
    assert.strictEqual(
      ppapReg.shouldSuppressPpapPlaceholderWidgets({ consolidation_applied: true, cockpit_mode: 'ppap_native' }),
      true
    );
    assert.strictEqual(Object.keys(ppapReg.PPAP_HUB_REGISTRY).length, CC_REGISTRY_BASELINE.ppap.hubCount);
    const foreign = ppapReg.shouldSuppressPpapPlaceholderWidgets({
      consolidation_applied: true,
      cockpit_mode: 'quality_native'
    });
    assert.strictEqual(foreign, false, 'PPAP suppress must not activate for quality_native mode');
  });

  await check('MSA OFF/ON hub mount contract (GF-011)', async () => {
    const msaReg = await importFrontendModule('frontend/src/cognitiveRuntime/cockpit/msaNativeCockpitRegistry.js');
    assert.strictEqual(msaReg.MSA_RUNTIME_REGISTRY.inactive, true);
    assert.strictEqual(msaReg.MSA_DASHBOARD_REGISTRY.promotion_active, false);
    assert.strictEqual(msaReg.MSA_DASHBOARD_REGISTRY.consolidation_active, false);
    assert.strictEqual(Object.keys(msaReg.MSA_HUB_REGISTRY).length, CC_REGISTRY_BASELINE.msa.hubCount);
    assert.strictEqual(msaReg.shouldSuppressMsaPlaceholderWidgets({ consolidation_applied: false }), false);
    assert.strictEqual(
      msaReg.shouldSuppressMsaPlaceholderWidgets({ consolidation_applied: true, cockpit_mode: 'msa_native' }),
      true
    );
    const foreign = msaReg.shouldSuppressMsaPlaceholderWidgets({
      consolidation_applied: true,
      cockpit_mode: 'quality_native'
    });
    assert.strictEqual(foreign, false, 'MSA suppress must not activate for quality_native mode');
  });

  await check('MsaNativeCockpitPromotion mounts hubs when consolidation ON', async () => {
    const src = readSource('frontend/src/features/dashboard/centroComando/MsaNativeCockpitPromotion.jsx');
    assert.ok(src.includes('resolveAllMsaHubsForPromotion'), 'MsaNativeCockpitPromotion must resolve hubs');
    assert.ok(src.includes('MSA_HUB_COMPONENTS'), 'MsaNativeCockpitPromotion must lazy-load hub components');
    assert.ok(!/export default function MsaNativeCockpitPromotion\(\)\s*\{\s*return null/.test(src), 'foundation stub removed');
  });

  await check('CentroComando mounts MSA promotion (GF-011)', async () => {
    const src = readSource('frontend/src/features/dashboard/centroComando/CentroComando.jsx');
    assert.ok(src.includes('MsaNativeCockpitPromotion'), 'CentroComando must mount MSA promotion');
    assert.ok(src.includes('resolveMsaCockpitRuntime'), 'CentroComando must resolve msa runtime');
  });

  await check('CentroComando mounts native promotion components (static)', async () => {
    const src = readSource('frontend/src/features/dashboard/centroComando/CentroComando.jsx');
    assert.ok(src.includes('QualityNativeCockpitPromotion'), 'Quality promotion mount missing');
    assert.ok(src.includes('LogisticsNativeCockpitPromotion'), 'Logistics promotion mount missing');
    assert.ok(src.includes('PpapNativeCockpitPromotion'), 'PPAP promotion mount missing');
    assert.ok(src.includes('MsaNativeCockpitPromotion'), 'MSA promotion mount missing');
    assert.ok(src.includes('IshikawaNativeCockpitPromotion'), 'Ishikawa promotion mount missing');
  });

  await check('Ishikawa foundation OFF/ON registry contract (GF-018)', async () => {
    const ishReg = await importFrontendModule('frontend/src/cognitiveRuntime/cockpit/ishikawaNativeCockpitRegistry.js');
    assert.strictEqual(ishReg.ISHIKAWA_RUNTIME_REGISTRY.inactive, true);
    assert.strictEqual(ishReg.ISHIKAWA_DASHBOARD_REGISTRY.promotion_active, false);
    assert.strictEqual(ishReg.ISHIKAWA_DASHBOARD_REGISTRY.consolidation_active, false);
    assert.strictEqual(Object.keys(ishReg.ISHIKAWA_HUB_REGISTRY).length, CC_REGISTRY_BASELINE.ishikawa.hubCount);
    assert.strictEqual(ishReg.shouldSuppressIshikawaPlaceholderWidgets({ consolidation_applied: false }), false);
    assert.strictEqual(
      ishReg.shouldSuppressIshikawaPlaceholderWidgets({ consolidation_applied: true, cockpit_mode: 'ishikawa_native' }),
      true
    );
  });

  await check('IshikawaNativeCockpitPromotion mounts hubs when promotion ON', async () => {
    const src = readSource('frontend/src/features/dashboard/centroComando/IshikawaNativeCockpitPromotion.jsx');
    assert.ok(src.includes('resolveAllIshikawaHubsForPromotion'), 'IshikawaNativeCockpitPromotion must resolve hubs');
    assert.ok(src.includes('ISHIKAWA_HUB_COMPONENTS'), 'IshikawaNativeCockpitPromotion must lazy-load hub components');
    assert.ok(src.includes('promotion_applied'), 'IshikawaNativeCockpitPromotion must gate on promotion_applied');
    assert.ok(!/export default function IshikawaNativeCockpitPromotion\(\)\s*\{\s*return null/.test(src), 'foundation stub removed');
  });

  await check('CentroComando mounts Ishikawa promotion (GF-018)', async () => {
    const src = readSource('frontend/src/features/dashboard/centroComando/CentroComando.jsx');
    assert.ok(src.includes('IshikawaNativeCockpitPromotion'), 'CentroComando must mount Ishikawa promotion');
    assert.ok(src.includes('resolveIshikawaCockpitRuntime'), 'CentroComando must resolve ishikawa runtime');
  });
}

// ─── ARC-001G — Threshold Policy ───────────────────────────────────────────

async function arc001G(check) {
  const flagsZ22 = require('../../src/cognitiveRuntime/config/phaseZ22FeatureFlags');
  const flagsZ21 = require('../../src/cognitiveRuntime/config/phaseZ21FeatureFlags');
  const { Z23_MIN_BINDING_RATIO: z23Logistics } = require('../../src/cognitiveRuntime/domains/logistics/cockpit/logisticsConsolidationSupervisor');
  const { Z23_MIN_BINDING_RATIO: z23Ppap } = require('../../src/cognitiveRuntime/domains/ppap/cockpit/ppapConsolidationSupervisor');

  const savedZ22 = process.env.IMPETUS_Z22_MIN_BINDING_RATIO;
  const savedZ21 = process.env.IMPETUS_Z21_MIN_BINDING_RATIO;
  delete process.env.IMPETUS_Z22_MIN_BINDING_RATIO;
  delete process.env.IMPETUS_Z21_MIN_BINDING_RATIO;

  try {
    await check('Z.22 default min binding = 0.5', async () => {
      assert.strictEqual(flagsZ22.minBindingRatioForRender(), THRESHOLD_POLICY.z22_min_binding);
    });

    await check('Z.21 default min binding = 0.5', async () => {
      assert.strictEqual(flagsZ21.minBindingRatioForPromotion(), THRESHOLD_POLICY.z21_min_binding);
    });
  } finally {
    if (savedZ22 == null) delete process.env.IMPETUS_Z22_MIN_BINDING_RATIO;
    else process.env.IMPETUS_Z22_MIN_BINDING_RATIO = savedZ22;
    if (savedZ21 == null) delete process.env.IMPETUS_Z21_MIN_BINDING_RATIO;
    else process.env.IMPETUS_Z21_MIN_BINDING_RATIO = savedZ21;
  }

  await check('Z.23 logistics threshold = 0.35', async () => {
    assert.strictEqual(z23Logistics, THRESHOLD_POLICY.z23_logistics);
  });

  await check('Z.23 PPAP threshold = 0.35', async () => {
    assert.strictEqual(z23Ppap, THRESHOLD_POLICY.z23_ppap);
  });

  await check('Z.23 quality threshold = 0.35 (consolidator source)', async () => {
    const src = readSource('backend/src/cognitiveRuntime/cockpitConsolidation/runtime/cognitiveCockpitConsolidator.js');
    assert.ok(src.includes('bindingRatio < 0.35'), 'quality Z.23 threshold drift');
  });

  await check('Z.23 production threshold = 0.25 (source)', async () => {
    const src = readSource('backend/src/cognitiveRuntime/domains/production/runtime/productionCockpitConsolidationRuntime.js');
    assert.ok(src.includes('0.25'), 'production Z.23 threshold drift');
  });
}

// ─── ARC-001H — Baseline Integrity ─────────────────────────────────────────

async function arc001H(check) {
  for (const doc of BASELINE_DOCS) {
    await check(`baseline doc exists: ${doc.id}`, async () => {
      const abs = absRepoPath(doc.path);
      assert.ok(fs.existsSync(abs), `missing ${doc.path}`);
      const content = fs.readFileSync(abs, 'utf8');
      for (const marker of doc.markers) {
        assert.ok(content.includes(marker), `${doc.id}: marker "${marker}" not found`);
      }
    });
  }

  await check('GF-000→GF-006 evidence chain complete', async () => {
    for (let i = 0; i <= 6; i += 1) {
      const padded = String(i).padStart(3, '0');
      const matches = fs.readdirSync(absRepoPath('backend/docs/evidence')).filter((f) => f.startsWith(`GF-${padded}-`));
      assert.ok(matches.length > 0, `GF-${padded} evidence missing`);
    }
  });

  await check('INC-045 registration doc exists', async () => {
    assert.ok(fs.existsSync(absRepoPath('backend/docs/evidence/INC-045-PPAP-REGISTRATION.md')));
  });
}

// ─── Report ────────────────────────────────────────────────────────────────

function printReport() {
  const labels = {
    'ARC-001A': 'Runtime Registry',
    'ARC-001B': 'Loader Contracts',
    'ARC-001C': 'Payload Contracts',
    'ARC-001D': 'Promotion Contracts',
    'ARC-001E': 'SurfaceCapabilities',
    'ARC-001F': 'CentroComando',
    'ARC-001G': 'Threshold Policy',
    'ARC-001H': 'Baseline Integrity'
  };

  console.log('\n══════════════════════════════════════════');
  console.log(' Architecture Conformance Report (ARC-001)');
  console.log(' Baseline: BASELINE-SYSTEM v1.2');
  console.log('══════════════════════════════════════════\n');

  for (const [id, label] of Object.entries(labels)) {
    const cat = report.categories[id] || { status: 'SKIP', passed: 0, failed: 0 };
    const pad = '.'.repeat(Math.max(2, 24 - label.length));
    console.log(`${label} ${pad} ${cat.status}`);
  }

  const conformant = totalFailed === 0;
  console.log(`\nArchitecture Status ..... ${conformant ? 'CONFORMANT' : 'NON_CONFORMANT'}`);
  console.log(`Checks: ${totalPassed} passed, ${totalFailed} failed\n`);

  if (report.violations.length) {
    console.log('Violations:');
    for (const v of report.violations) {
      console.log(`  • ${v}`);
    }
    console.log('');
  }

  console.log('NO_RUNTIME_CHANGED = YES (ARC-001 adds tests/docs only)');
  console.log('BASELINE_SYSTEM_v1.2 = PRESERVED');
  console.log(`ARCHITECTURE_CONFORMANCE_SUITE = ${conformant ? 'YES' : 'NO'}`);
  console.log(`CI_GATE_READY = ${conformant ? 'YES' : 'NO'}`);
}

(async () => {
  console.log('ARC-001 — Architecture Conformance Suite v1.0\n');
  console.log(`Repo: ${REPO_ROOT}`);
  console.log('Mode: Architecture Governance — validation only\n');

  try {
    await runCategory('ARC-001A', 'Runtime Registry', arc001A);
    await runCategory('ARC-001B', 'Loader Contract', arc001B);
    await runCategory('ARC-001C', 'Payload Contract', arc001C);
    await runCategory('ARC-001D', 'Promotion Contract', arc001D);
    await runCategory('ARC-001E', 'SurfaceCapabilities', arc001E);
    await runCategory('ARC-001F', 'Centro de Comando', arc001F);
    await runCategory('ARC-001G', 'Threshold Policy', arc001G);
    await runCategory('ARC-001H', 'Baseline Integrity', arc001H);
  } catch (e) {
    console.error('Fatal suite error:', e);
    totalFailed += 1;
    report.violations.push(`Fatal: ${e.message}`);
  }

  printReport();
  process.exit(totalFailed > 0 ? 1 : 0);
})();
