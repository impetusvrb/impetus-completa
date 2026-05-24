'use strict';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${msg}`);
  } else {
    failed++;
    console.log(`  FAIL  ${msg}`);
  }
}

function resetEnvAndCache() {
  process.env.IMPETUS_SZ1_SOVEREIGNTY = 'on';
  process.env.IMPETUS_SZ1_BOOTSTRAP = 'on';
  process.env.IMPETUS_SZ1_KPI = 'on';
  process.env.IMPETUS_SZ1_MODULES = 'on';
  process.env.IMPETUS_SZ1_SECTIONS = 'on';
  process.env.IMPETUS_SZ1_COMPOSITION = 'on';
  process.env.IMPETUS_SZ1_CONTEXT = 'on';
  process.env.IMPETUS_SZ1_IDENTITY = 'on';
  process.env.IMPETUS_SZ1_HYDRATION = 'on';
  process.env.IMPETUS_SZ1_FALLBACK = 'on';
  process.env.IMPETUS_SZ1_RESILIENCE = 'on';
  process.env.IMPETUS_SZ1_SHADOW_DIFF = 'on';
  process.env.IMPETUS_SZ1_PROMOTION = 'on';
  process.env.IMPETUS_SZ1_GOVERNANCE = 'on';
  process.env.IMPETUS_SZ1_OBSERVABILITY = 'on';
  process.env.IMPETUS_SZ1_DEFAULT_STAGE = 'Z_SHADOW';
  process.env.IMPETUS_SZ1_PROMOTED_TENANTS = '';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/runtime-z-sovereign/')) delete require.cache[k];
  }
}

const USER = {
  id: 'u_sz1',
  company_id: 'tenant_sz1',
  role: 'supervisor',
  hierarchy_level: 3,
  functional_area: 'quality',
  dashboard_profile: 'supervisor_quality'
};

const LEGACY_PAYLOAD = {
  profile_code: 'supervisor_quality',
  profile_label: 'Supervisor Qualidade',
  profile_config: { label: 'Supervisor Qualidade' },
  visible_modules: ['quality', 'audits', 'capa'],
  sections: [{ key: 'quality_section', label: 'Qualidade' }],
  kpis: [
    { key: 'nc_count', title: 'NCs abertas', value: 12 },
    { key: 'capa_open', title: 'CAPA abertas', value: 5 }
  ],
  ia_data_depth: 'standard',
  effective_permissions: { quality: ['read', 'write'] },
  user_context: { hierarchy_tier: 'tactical' },
  is_tenant_admin: false,
  functional_area: 'quality'
};

function testFlags() {
  console.log('\n=== Flags / promotion ===');
  resetEnvAndCache();
  const f = require('../../src/runtime-z-sovereign/config/phaseSZ1FeatureFlags');
  assert(f.STAGES.includes('Z_SHADOW'), 'STAGES contains Z_SHADOW');
  assert(f.invariants.motor_a_never_deleted === true, 'invariant motor_a_never_deleted');
  assert(f.invariants.engine_v2_never_deleted === true, 'invariant engine_v2_never_deleted');
  assert(f.invariants.no_auto_promotion === true, 'invariant no_auto_promotion');
  assert(f.invariants.shadow_first === true, 'invariant shadow_first');

  const { resolveStageForTenant, isShadowOnly, isZPrimary } = require('../../src/runtime-z-sovereign/promotion/zPromotionRuntime');
  const stage = resolveStageForTenant(USER, {});
  assert(typeof stage.stage === 'string', 'stage resolves');
  assert(isShadowOnly('Z_SHADOW') === true, 'isShadowOnly');
  assert(isZPrimary('Z_SOVEREIGN') === true, 'isZPrimary');
}

function testKpiNormalization() {
  console.log('\n=== KPI normalization & fallback ===');
  resetEnvAndCache();
  const { normalize } = require('../../src/runtime-z-sovereign/kpi/zKpiNormalizationRuntime');
  const norm = normalize([
    { key: 'a', title: 'A', value: 1 },
    null,
    { id: 'b', label: 'B', value: 2 }
  ]);
  assert(norm.length === 2, 'filters nulls');
  assert(norm[0].id === 'a' && norm[0].key === 'a', 'normalises id/key');
  assert(norm[1].title === 'B', 'maps label→title');

  const { aggregate } = require('../../src/runtime-z-sovereign/kpi/zKpiAggregator');
  const agg = aggregate(norm);
  assert(agg.total === 2, 'aggregates total');
  assert(Array.isArray(agg.domains_covered), 'domains_covered array');

  const { fallbackKpis } = require('../../src/runtime-z-sovereign/kpi/zKpiFallbackRuntime');
  const fb = fallbackKpis(USER);
  assert(fb.length >= 1 && fb[0].degraded === true, 'fallback degraded flag');
}

function testHydrationPlan() {
  console.log('\n=== Hydration plan ===');
  resetEnvAndCache();
  const { buildHydrationPlan } = require('../../src/runtime-z-sovereign/hydration/zHydrationRuntime');
  const plan = buildHydrationPlan({
    widgets_promoted: [{ id: 'w_a' }, { id: 'w_b' }],
    widgets_legacy: [{ id: 'w_a' }, { id: 'w_legacy' }],
    engine_v2: { payload: { layout: { widgets: [{ id: 'w_v2' }] } } }
  });
  assert(plan.plan.length >= 3, 'plan merges tiers');
  const ids = plan.plan.map((w) => w.id);
  assert(new Set(ids).size === ids.length, 'no duplicate widget ids');
  assert(plan.tiers_used.promoted === 2, 'promoted tier counted');
  assert(plan.tiers_used.motor_a_legacy >= 1, 'legacy tier counted');
}

function testFallbackAndResilience() {
  console.log('\n=== Fallback & resilience ===');
  resetEnvAndCache();
  const { buildSovereignFallback } = require('../../src/runtime-z-sovereign/fallback/zFallbackRuntime');
  const fb = buildSovereignFallback(USER, { visible_modules: ['m1', 'm2'] });
  assert(fb.fallback.widgets.length >= 1, 'fallback always returns widgets');
  assert(fb.fallback.degraded === true, 'fallback flagged degraded');
  assert(fb.rollback_safe === true, 'fallback rollback_safe');

  const fb2 = buildSovereignFallback(USER, {});
  assert(fb2.fallback.widgets.length === 1 && fb2.fallback.empty === true, 'empty modules → empty_state widget');

  const { ensureContinuity } = require('../../src/runtime-z-sovereign/resilience/zResilienceRuntime');
  const r1 = ensureContinuity(USER, LEGACY_PAYLOAD);
  assert(r1.continuity_score > 0.5, 'continuity_score for healthy payload');

  const r2 = ensureContinuity(USER, { profile_code: 'x' });
  assert(r2.blank_screen_prevented === true || r2.payload.z_fallback_layout, 'blank-screen prevention triggers');
}

function testShadowDiff() {
  console.log('\n=== Shadow diff ===');
  resetEnvAndCache();
  const { compareLegacyVsSovereign } = require('../../src/runtime-z-sovereign/shadow/zShadowDiffRuntime');

  const sameDiff = compareLegacyVsSovereign(LEGACY_PAYLOAD, LEGACY_PAYLOAD);
  assert(sameDiff.divergence_score === 0, 'identical payloads → divergence 0');
  assert(sameDiff.compatibility_score === 1, 'identical payloads → compatibility 1');
  assert(sameDiff.safe_to_promote === true, 'identical → safe_to_promote');

  const diff = compareLegacyVsSovereign(LEGACY_PAYLOAD, {
    ...LEGACY_PAYLOAD,
    profile_code: 'other',
    visible_modules: ['quality']
  });
  assert(diff.divergence_score > 0, 'divergence detected');
  assert(diff.safe_to_promote === false, 'divergent profile → not safe to promote');
}

function testValidationAndCompatibility() {
  console.log('\n=== Validation & compatibility ===');
  resetEnvAndCache();
  const { validateBootstrap } = require('../../src/runtime-z-sovereign/bootstrap/zBootstrapValidationEngine');
  const v = validateBootstrap(LEGACY_PAYLOAD);
  assert(v.ok === true, 'legacy payload satisfies required keys');
  assert(v.bootstrap_safe === true, 'bootstrap_safe');

  const v2 = validateBootstrap({ profile_code: 'x' });
  assert(v2.ok === false || v2.bootstrap_safe === false, 'partial payload → not safe');

  const { ensureCompatibility } = require('../../src/runtime-z-sovereign/bootstrap/zBootstrapCompatibilityRuntime');
  const cmp = ensureCompatibility({ profile_code: 'x' }, LEGACY_PAYLOAD);
  assert(cmp.missing_keys.length > 0, 'compatibility detects missing legacy keys');
  assert(cmp.payload.visible_modules?.length === LEGACY_PAYLOAD.visible_modules.length, 'compatibility restores missing keys');
}

function testGovernance() {
  console.log('\n=== Sovereignty governance ===');
  resetEnvAndCache();
  const { evaluateGovernance } = require('../../src/runtime-z-sovereign/governance/zSovereigntyGovernanceRuntime');
  const g = evaluateGovernance(
    { stage: 'Z_SHADOW' },
    { safe_to_promote: false },
    { bootstrap_safe: true },
    { compatible: true }
  );
  assert(g.promotion_allowed === false, 'no auto promotion (invariant)');
  assert(g.compatibility_layer_active === true, 'motor a + v2 preserved as compatibility');
  assert(g.sovereignty_state.motor_a === 'preserved_as_compatibility', 'motor_a preserved');
  assert(g.sovereignty_state.engine_v2 === 'preserved_as_compatibility', 'engine_v2 preserved');
}

async function testFacade() {
  console.log('\n=== Sovereign facade (shadow stage) ===');
  resetEnvAndCache();
  const { applySovereignZRuntime } = require('../../src/runtime-z-sovereign/facade/zSovereignFacade');
  const out = await applySovereignZRuntime(USER, LEGACY_PAYLOAD, {});
  assert(out.runtime_z_sovereign?.phase === 'SZ1', 'phase SZ1');
  assert(out.runtime_z_sovereign?.stage === 'Z_SHADOW', 'shadow stage by default');
  assert(out.runtime_z_sovereign?.primary_runtime === 'motor_a', 'motor a stays primary in shadow');
  assert(out.runtime_z_sovereign?.auto_promotion === false, 'no auto promotion');
  assert(out.runtime_z_sovereign?.motor_a_removed === false, 'motor a not removed');
  assert(out.runtime_z_sovereign?.engine_v2_removed === false, 'engine v2 not removed');
  assert(out.payload?.profile_code === LEGACY_PAYLOAD.profile_code, 'legacy payload preserved');
  assert(typeof out.runtime_z_sovereign?.metrics === 'object', 'metrics exposed');
  assert(typeof out.runtime_z_sovereign?.invariants === 'object', 'invariants exposed');

  console.log('\n=== Sovereign facade (promoted tenant) ===');
  resetEnvAndCache();
  process.env.IMPETUS_SZ1_PROMOTED_TENANTS = 'tenant_sz1';
  process.env.IMPETUS_SZ1_PROMOTED_TENANT_STAGE = 'Z_ASSISTIVE';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/runtime-z-sovereign/')) delete require.cache[k];
  }
  const { applySovereignZRuntime: apply2 } = require('../../src/runtime-z-sovereign/facade/zSovereignFacade');
  const out2 = await apply2(USER, LEGACY_PAYLOAD, {});
  assert(out2.runtime_z_sovereign?.stage === 'Z_ASSISTIVE', 'promoted tenant → assistive');
  assert(out2.runtime_z_sovereign?.primary_runtime === 'motor_a', 'assistive still keeps motor_a primary (no auto)');

  console.log('\n=== Sovereign facade (off) ===');
  resetEnvAndCache();
  process.env.IMPETUS_SZ1_SOVEREIGNTY = 'off';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/runtime-z-sovereign/')) delete require.cache[k];
  }
  const { applySovereignZRuntime: apply3 } = require('../../src/runtime-z-sovereign/facade/zSovereignFacade');
  const out3 = await apply3(USER, LEGACY_PAYLOAD, {});
  assert(out3.skipped === true && out3.payload === LEGACY_PAYLOAD, 'sovereignty off → payload untouched');
}

async function run() {
  console.log('SZ1 — Runtime Z Sovereign Consolidation Tests');
  testFlags();
  testKpiNormalization();
  testHydrationPlan();
  testFallbackAndResilience();
  testShadowDiff();
  testValidationAndCompatibility();
  testGovernance();
  await testFacade();
  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
