'use strict';

/**
 * Z.25.1 — Live validation SST cockpit (in-process pipeline = produção real PM2 codepath)
 */

const {
  PROFILE_FIXTURES,
  stableHash,
  runProfilePipeline,
  analyzeSstPayload
} = require('./lib/sstLiveValidationHarness');

let passed = 0;
let failed = 0;
const findings = [];

function assert(c, m) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    findings.push(m);
    console.log(`  FAIL  ${m}`);
  }
}

function resetEnv() {
  process.env.IMPETUS_SST_NATIVE_COCKPIT = 'pilot';
  process.env.IMPETUS_SAFETY_COGNITIVE_RUNTIME = 'shadow';
  process.env.IMPETUS_SAFETY_RENDER_PROMOTION = 'controlled';
  process.env.IMPETUS_SAFETY_DENSITY_GOVERNOR = 'on';
  process.env.IMPETUS_SST_OBSERVABILITY = 'on';
  process.env.IMPETUS_COGNITIVE_COMPOSITION_ENGINE = 'on';
  process.env.IMPETUS_COGNITIVE_RUNTIME = 'on';
  process.env.IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/') || k.includes('/services/dashboardProfile')) {
      delete require.cache[k];
    }
  }
}

async function testProfileLive(fixture) {
  console.log(`\n--- LIVE ${fixture.profile_code} (${fixture.id}) ---`);
  resetEnv();
  const user = { company_id: 'z251_live', id: fixture.id, ...fixture };
  const r1 = await runProfilePipeline(user, { force_consolidation: true });
  const a1 = analyzeSstPayload(r1.payload, fixture.profile_code);

  assert(a1.cockpit_mode === 'safety_native', `${fixture.id} safety_native mode`);
  assert(a1.consolidation_applied === true, `${fixture.id} consolidation applied`);
  assert(a1.center_count >= 4 && a1.center_count <= 8, `${fixture.id} density centers ${a1.center_count}`);
  assert(a1.widget_count >= 2 && a1.widget_count <= 8, `${fixture.id} widgets ${a1.widget_count}`);
  assert(a1.centers_coverage >= 0.75, `${fixture.id} core centers present`);
  assert(a1.safety_semantic_hits >= 3, `${fixture.id} safety semantic density`);
  assert(a1.executive_leak === false, `${fixture.id} zero executive leakage`);
  assert(a1.visible_generic_widgets.length === 0, `${fixture.id} no visible generic widgets`);
  assert(
    (a1.safety_cognitive_health?.healthy === true) || (a1.specialization_ratio >= 0.45),
    `${fixture.id} cognitive health ok`
  );
  assert(
    (a1.decision_questions || []).some((q) => /incidente|APR|comportamento|risco/i.test(q)),
    `${fixture.id} contextual safety AI questions`
  );

  const h1 = stableHash({
    centers: a1.center_ids,
    widgets: a1.widget_ids,
    mode: a1.cockpit_mode,
    ratio: a1.specialization_ratio
  });
  const r2 = await runProfilePipeline(user, { force_consolidation: true });
  const a2 = analyzeSstPayload(r2.payload, fixture.profile_code);
  const h2 = stableHash({
    centers: a2.center_ids,
    widgets: a2.widget_ids,
    mode: a2.cockpit_mode,
    ratio: a2.specialization_ratio
  });
  assert(h1 === h2, `${fixture.id} determinism hash stable`);

  return a1;
}

async function testKpiChannelGap() {
  console.log('\n--- KPI channel gap (known) ---');
  resetEnv();
  const dashboardKPIs = require('../../src/services/dashboardKPIs');
  const tenantId = '00000000-0000-4000-a000-000000000251';
  const user = {
    id: '00000000-0000-4000-a000-000000000252',
    company_id: tenantId,
    role: 'coordenador',
    functional_area: 'safety',
    dashboard_profile: 'coordinator_safety',
    hierarchy_level: 3
  };
  let kpis = [];
  try {
    kpis = await dashboardKPIs.getDashboardKPIs(user, { isFullAccess: true, companyId: tenantId });
  } catch (e) {
    console.log(`  INFO  KPI DB skipped: ${e.message}`);
  }
  const titles = kpis.map((k) => k.title || '').join(' ');
  const hasSafetyKpi = /incidente|acidente|epi|apr|sst|seguranca/i.test(titles);
  const hasGenericOnly =
    kpis.length === 0 || /intera[cç][oõ]es|insights operacionais|propostas em andamento/i.test(titles);
  console.log(`  INFO  KPI titles: ${titles.slice(0, 120) || '(empty or DB off)'}`);
  assert(hasGenericOnly, 'KPI channel still generic coordinator (documented gap)');
  assert(!hasSafetyKpi, 'KPI channel lacks dedicated SST metrics (gap for Z.25.2)');
  console.log('  INFO  KPI adapter SST not yet wired — cockpit Z.25 compensates via centers/widgets');
}

async function main() {
  console.log('Z.25.1 SST Live Validation');
  const results = [];
  for (const f of PROFILE_FIXTURES) {
    results.push(await testProfileLive(f));
  }
  await testKpiChannelGap();

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  if (findings.length) console.log('Findings:', findings.join('; '));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
