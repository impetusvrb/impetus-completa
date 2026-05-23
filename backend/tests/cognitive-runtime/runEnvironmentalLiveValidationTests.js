'use strict';

const {
  PROFILE_FIXTURES,
  MOCK_SIGNALS,
  MOCK_SIGNALS_STALE,
  MOCK_SIGNALS_EMPTY,
  MOCK_SIGNALS_EXPIRED,
  stableHash,
  runProfilePipeline,
  analyzeEnvironmentalPayload
} = require('./lib/environmentalLiveValidationHarness');

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
  process.env.IMPETUS_ENVIRONMENTAL_NATIVE_COCKPIT = 'pilot';
  process.env.IMPETUS_ENVIRONMENTAL_COGNITIVE_RUNTIME = 'shadow';
  process.env.IMPETUS_ENVIRONMENTAL_RENDER_PROMOTION = 'controlled';
  process.env.IMPETUS_ENVIRONMENTAL_LIVE_VALIDATION = 'shadow';
  process.env.IMPETUS_REGULATORY_GOVERNANCE = 'on';
  process.env.IMPETUS_ENVIRONMENTAL_RUNTIME_HEALTH = 'on';
  process.env.IMPETUS_ENVIRONMENTAL_ALERT_PROTECTION = 'on';
  process.env.IMPETUS_ENVIRONMENTAL_PERFORMANCE_OBSERVABILITY = 'on';
  process.env.IMPETUS_ENVIRONMENTAL_GOVERNANCE = 'on';
  process.env.IMPETUS_COGNITIVE_COMPOSITION_ENGINE = 'on';
  process.env.IMPETUS_COGNITIVE_RUNTIME = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/') || k.includes('/services/dashboardProfile')) {
      delete require.cache[k];
    }
  }
}

async function testTelemetryHealth() {
  console.log('\n=== Environmental telemetry health ===');
  resetEnv();
  const { validateEnvironmentalTelemetryHealth } = require('../../src/cognitiveRuntime/domains/environmental/liveValidation/telemetry/environmentalTelemetryHealth');
  const ready = validateEnvironmentalTelemetryHealth(MOCK_SIGNALS);
  assert(ready.environmental_telemetry_health.invented_data === false, 'no invented telemetry');
  assert(ready.environmental_telemetry_health.ready === true, 'telemetry ready');

  const stale = validateEnvironmentalTelemetryHealth(MOCK_SIGNALS_STALE);
  assert(stale.environmental_telemetry_health.stale_detected === true, 'stale detected');

  const empty = validateEnvironmentalTelemetryHealth(MOCK_SIGNALS_EMPTY);
  assert(empty.environmental_telemetry_health.ready !== true, 'empty not falsely ready');
}

async function testCompliance() {
  console.log('\n=== Regulatory compliance ===');
  resetEnv();
  const v = require('../../src/cognitiveRuntime/domains/environmental/liveValidation/compliance/environmentalComplianceValidator');
  assert(v.validateEnvironmentalCompliance(MOCK_SIGNALS).compliant === true, 'compliant when licenses ok');
  assert(v.validateEnvironmentalCompliance(MOCK_SIGNALS_EXPIRED).compliance_drift === true, 'drift on expired license');
  assert(v.validateEnvironmentalCompliance(MOCK_SIGNALS_EXPIRED).legal_risk === true, 'legal risk detected');
}

async function testEsgContextual() {
  console.log('\n=== ESG contextual ===');
  resetEnv();
  const { validateContextualEsg } = require('../../src/cognitiveRuntime/domains/environmental/liveValidation/validation/contextualEsgValidator');
  const esg = validateContextualEsg(MOCK_SIGNALS);
  assert(esg.contextual === true, 'esg contextual');
  assert(esg.boardroom_generic === false, 'not boardroom generic');
  const { validateSustainabilitySemanticIntegrity } = require('../../src/cognitiveRuntime/domains/environmental/liveValidation/validation/sustainabilitySemanticIntegrity');
  assert(validateSustainabilitySemanticIntegrity({ centers: [{ summary: 'conformidade emissões resíduos' }] }).ok === true, 'semantic integrity');
}

async function testDensity() {
  console.log('\n=== Density & alert fatigue ===');
  resetEnv();
  const d = require('../../src/cognitiveRuntime/domains/environmental/liveValidation/density/environmentalDensityIntegrity');
  const ok = d.validateEnvironmentalDensityIntegrity({
    centers: Array.from({ length: 5 }, (_, i) => ({ center_id: `c${i}`, metrics: { a: 1 } })),
    widgets: Array.from({ length: 6 }, (_, i) => ({ id: `w${i}` }))
  });
  assert(ok.density_safe === true, 'density safe');
  const { measureEnvironmentalAlertPressure } = require('../../src/cognitiveRuntime/domains/environmental/liveValidation/density/environmentalAlertPressure');
  const fatigue = measureEnvironmentalAlertPressure([
    { render_slot: 'alertas' },
    { render_slot: 'alertas' },
    { render_slot: 'alertas' },
    { render_slot: 'alertas' }
  ]);
  assert(fatigue.alert_fatigue === true, 'alert fatigue >3');
}

async function testIsolation() {
  console.log('\n=== Cross-domain isolation ===');
  resetEnv();
  const b = require('../../src/cognitiveRuntime/domains/environmental/liveValidation/governance/environmentalBoundaryValidator');
  assert(b.validateEnvironmentalBoundary({ summary: 'emissões ESG licenças conformidade' }).cross_domain_clean === true, 'environmental clean');
  assert(b.validateEnvironmentalBoundary({ summary: 'OEE throughput turno produção' }).cross_domain_clean === false, 'production leak blocked');
  assert(b.validateEnvironmentalBoundary({ summary: 'turnover absenteismo RH' }).cross_domain_clean === false, 'hr leak blocked');
}

async function testAi() {
  console.log('\n=== Environmental AI ===');
  resetEnv();
  const ai = require('../../src/cognitiveRuntime/domains/environmental/liveValidation/ai/environmentalAiOperationalValidator');
  const ok = ai.validateEnvironmentalAiOperational(
    {},
    { environmental_contextual_questions: ['Emissões degradando?', 'Risco regulatório?', 'Conformidade legal?'] }
  );
  assert(ok.ok === true, 'ai operational ok');
  assert(ok.denied_leak === false, 'no ebitda/boardroom leak');
}

async function testFacade() {
  console.log('\n=== Live validation facade ===');
  resetEnv();
  const facade = require('../../src/cognitiveRuntime/domains/environmental/liveValidation/environmentalLiveValidationFacade');
  const r = await facade.runEnvironmentalLiveValidation({}, {}, { force_environmental_live_validation: true, mock_signals: MOCK_SIGNALS });
  const lv = r.environmental_live_validation;
  assert(lv.regulatory_integrity === true, 'regulatory_integrity');
  assert(lv.telemetry_safe === true, 'telemetry_safe');
  assert(lv.esg_contextual_valid === true, 'esg_contextual_valid');
  assert(lv.cross_domain_clean === true, 'cross_domain_clean');
  assert(lv.runtime_performance_safe === true, 'runtime_performance_safe');
  assert(r.environmental_telemetry_health?.trust_score > 0, 'trust score');
}

async function testStability() {
  console.log('\n=== Runtime stability ===');
  resetEnv();
  const { validateEnvironmentalRuntimeStability } = require('../../src/cognitiveRuntime/domains/environmental/liveValidation/runtime/environmentalRuntimeStability');
  const a = { centers: 3, widgets: 2 };
  assert(validateEnvironmentalRuntimeStability(a, { ...a }).environmental_runtime_stable === true, 'deterministic stability');
}

async function testPerformance() {
  console.log('\n=== Performance governance ===');
  resetEnv();
  const p = require('../../src/cognitiveRuntime/domains/environmental/liveValidation/performance/environmentalRuntimePerformance');
  assert(p.analyzeEnvironmentalRuntimePerformance({ total_ms: 120 }).runtime_performance_safe === true, 'perf safe');
}

async function testLivePipeline(fixture) {
  console.log(`\n--- LIVE ${fixture.profile_code} ---`);
  resetEnv();
  const user = { company_id: 'p1env_live', id: fixture.id, ...fixture };
  const r1 = await runProfilePipeline(user);
  const a1 = analyzeEnvironmentalPayload(r1.payload);

  assert(a1.cockpit_mode === 'environmental_native', `${fixture.id} environmental_native`);
  assert(a1.consolidation_applied === true, `${fixture.id} consolidation`);
  assert(a1.center_count <= 6, `${fixture.id} density centers`);
  assert(a1.widget_count <= 8, `${fixture.id} widgets`);
  assert(a1.executive_leak === false, `${fixture.id} no executive leak`);
  assert(a1.cross_domain_leak === false, `${fixture.id} no cross-domain leak`);

  const lv = a1.live_validation;
  if (lv && Object.keys(lv).length) {
    assert(lv.density_safe !== false, `${fixture.id} live density`);
    assert(lv.cross_domain_clean !== false, `${fixture.id} live isolation`);
  }

  const h1 = stableHash({ centers: a1.center_count, widgets: a1.widget_count, lv: a1.live_validation });
  const r2 = await runProfilePipeline(user);
  const a2 = analyzeEnvironmentalPayload(r2.payload);
  const h2 = stableHash({ centers: a2.center_count, widgets: a2.widget_count, lv: a2.live_validation });
  assert(h1 === h2, `${fixture.id} determinism refresh`);
}

async function main() {
  console.log('P1.1 Environmental Live Validation Tests');
  await testTelemetryHealth();
  await testCompliance();
  await testEsgContextual();
  await testDensity();
  await testIsolation();
  await testAi();
  await testFacade();
  await testStability();
  await testPerformance();
  for (const f of PROFILE_FIXTURES) await testLivePipeline(f);
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
