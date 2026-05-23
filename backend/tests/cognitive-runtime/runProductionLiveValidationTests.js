'use strict';

const {
  PROFILE_FIXTURES,
  MOCK_SIGNALS,
  MOCK_SIGNALS_STALE,
  MOCK_SIGNALS_EMPTY,
  stableHash,
  runProfilePipeline,
  analyzeProductionPayload
} = require('./lib/productionLiveValidationHarness');

let passed = 0;
let failed = 0;

function assert(c, m) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
  }
}

function resetEnv() {
  process.env.IMPETUS_PRODUCTION_NATIVE_COCKPIT = 'pilot';
  process.env.IMPETUS_PRODUCTION_COGNITIVE_RUNTIME = 'production_native';
  process.env.IMPETUS_PRODUCTION_RENDER_PROMOTION = 'controlled';
  process.env.IMPETUS_PRODUCTION_LIVE_VALIDATION = 'shadow';
  process.env.IMPETUS_TELEMETRY_GOVERNANCE = 'on';
  process.env.IMPETUS_INDUSTRIAL_RUNTIME_HEALTH = 'on';
  process.env.IMPETUS_PRODUCTION_OVERLOAD_PROTECTION = 'on';
  process.env.IMPETUS_PRODUCTION_PERFORMANCE_OBSERVABILITY = 'on';
  process.env.IMPETUS_COGNITIVE_COMPOSITION_ENGINE = 'on';
  process.env.IMPETUS_COGNITIVE_RUNTIME = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/') || k.includes('/services/dashboardProfile')) {
      delete require.cache[k];
    }
  }
}

async function testTelemetryGovernance() {
  console.log('\n=== Telemetry governance ===');
  resetEnv();
  const { validateTelemetryHealth } = require('../../src/cognitiveRuntime/domains/production/liveValidation/telemetry/telemetryHealthValidator');
  const ready = validateTelemetryHealth(MOCK_SIGNALS, MOCK_SIGNALS.telemetry);
  assert(ready.telemetry_health.ready === true, 'telemetry ready');
  assert(ready.telemetry_health.invented_telemetry === false, 'no invented telemetry');

  const stale = validateTelemetryHealth(MOCK_SIGNALS_STALE, MOCK_SIGNALS_STALE.telemetry);
  assert(stale.telemetry_health.stale_detected === true, 'stale detected');

  const empty = validateTelemetryHealth(MOCK_SIGNALS_EMPTY, {});
  assert(empty.telemetry_health.empty_state === true, 'empty state honest');
}

async function testOeeUsefulness() {
  console.log('\n=== OEE usefulness ===');
  resetEnv();
  const v = require('../../src/cognitiveRuntime/domains/production/liveValidation/validation/oeeUsefulnessValidator');
  assert(v.validateOeeUsefulness(MOCK_SIGNALS).useful === true, 'oee useful');
  assert(v.validateOeeUsefulness(MOCK_SIGNALS_EMPTY).false_operational === false, 'empty not false operational');
}

async function testDensity() {
  console.log('\n=== Density & overload ===');
  resetEnv();
  const d = require('../../src/cognitiveRuntime/domains/production/liveValidation/density/cognitiveDensityValidator');
  const ok = d.validateCognitiveDensity({
    centers: Array.from({ length: 5 }, (_, i) => ({ center_id: `c${i}`, metrics: { a: 1 }, render_slot: 'kpi_cards' })),
    widgets: Array.from({ length: 6 }, (_, i) => ({ id: `w${i}`, render_promoted: true }))
  });
  assert(ok.density_safe === true, 'density safe');
  const bad = d.validateCognitiveDensity({
    centers: Array.from({ length: 9 }, (_, i) => ({ center_id: `c${i}`, render_slot: 'grafico_tendencia' })),
    widgets: Array.from({ length: 12 }, () => ({ render_promoted: true }))
  });
  assert(bad.overload.overload_detected === true, 'overload detected');
}

async function testSemanticIsolation() {
  console.log('\n=== Cross-domain isolation ===');
  resetEnv();
  const iso = require('../../src/cognitiveRuntime/domains/production/liveValidation/governance/productionSemanticIsolationValidator');
  assert(iso.validateProductionSemanticIsolation({ summary: 'OEE throughput linha' }, {}).cross_domain_clean, 'production clean');
  assert(!iso.validateProductionSemanticIsolation({ summary: 'turnover absenteismo RH' }, {}).cross_domain_clean, 'hr leak blocked');
}

async function testStability() {
  console.log('\n=== Runtime stability ===');
  resetEnv();
  const { validateDeterministicTelemetry } = require('../../src/cognitiveRuntime/domains/production/liveValidation/runtime/deterministicTelemetryValidator');
  const ids = ['production.oee_contextual', 'production.throughput_monitor'];
  assert(validateDeterministicTelemetry(ids, ids).deterministic === true, 'deterministic composition');
}

async function testFacade() {
  console.log('\n=== Live validation facade ===');
  resetEnv();
  const facade = require('../../src/cognitiveRuntime/domains/production/liveValidation/productionLiveValidationFacade');
  const r = await facade.runProductionLiveValidation({}, {}, { force_production_live_validation: true, mock_signals: MOCK_SIGNALS });
  assert(r.production_live_validation?.telemetry_ready === true, 'facade telemetry_ready');
  assert(r.production_live_validation?.cross_domain_clean === true, 'facade cross_domain_clean');
  assert(r.telemetry_health?.trust_score > 0, 'trust score');
}

async function testLivePipeline(fixture) {
  console.log(`\n--- LIVE ${fixture.profile_code} ---`);
  resetEnv();
  const user = { company_id: 'zp1_live', id: fixture.id, ...fixture };
  const r1 = await runProfilePipeline(user, { force_consolidation: true });
  const a1 = analyzeProductionPayload(r1.payload);

  assert(a1.cockpit_mode === 'production_native', `${fixture.id} production_native`);
  assert(a1.consolidation_applied === true, `${fixture.id} consolidation`);
  assert(a1.center_count <= 6, `${fixture.id} density centers`);
  assert(a1.widget_count <= 8, `${fixture.id} widgets`);
  assert(a1.executive_leak === false, `${fixture.id} no executive leak`);
  assert(a1.production_semantic_hits >= 3, `${fixture.id} industrial semantic`);
  assert(a1.live_validation?.density_safe !== false, `${fixture.id} live validation density`);

  const h1 = stableHash({ centers: a1.center_count, widgets: a1.widget_count, lv: a1.live_validation });
  const r2 = await runProfilePipeline(user, { force_consolidation: true });
  const a2 = analyzeProductionPayload(r2.payload);
  const h2 = stableHash({ centers: a2.center_count, widgets: a2.widget_count, lv: a2.live_validation });
  assert(h1 === h2, `${fixture.id} determinism refresh`);
}

async function testPerformance() {
  console.log('\n=== Performance governance ===');
  resetEnv();
  const p = require('../../src/cognitiveRuntime/domains/production/liveValidation/performance/productionPerformanceAnalyzer');
  assert(p.analyzeProductionPerformance({ render_ms: 120, composition_ms: 80 }).performance_safe === true, 'perf safe');
}

async function main() {
  console.log('Z.P1 Production Live Validation Tests');
  await testTelemetryGovernance();
  await testOeeUsefulness();
  await testDensity();
  await testSemanticIsolation();
  await testStability();
  await testFacade();
  await testPerformance();
  for (const f of PROFILE_FIXTURES) await testLivePipeline(f);
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
