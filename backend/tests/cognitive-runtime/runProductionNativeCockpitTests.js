'use strict';

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

function resetCache() {
  process.env.IMPETUS_PRODUCTION_NATIVE_COCKPIT = 'pilot';
  process.env.IMPETUS_PRODUCTION_COGNITIVE_RUNTIME = 'shadow';
  process.env.IMPETUS_PRODUCTION_RENDER_PROMOTION = 'controlled';
  process.env.IMPETUS_PRODUCTION_TELEMETRY_RUNTIME = 'on';
  process.env.IMPETUS_PRODUCTION_DENSITY_GOVERNOR = 'on';
  process.env.IMPETUS_PRODUCTION_OBSERVABILITY = 'on';
  process.env.IMPETUS_COGNITIVE_COMPOSITION_ENGINE = 'on';
  process.env.IMPETUS_COGNITIVE_RUNTIME = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const MOCK_SIGNALS = {
  ok: true,
  telemetry_readiness: 'ready',
  operational: {
    throughput: 1200,
    target_qty: 1500,
    efficiency_pct: 80,
    scrap_qty: 12,
    downtime_proxy: 2,
    lines_active: 3,
    stability_index: 85,
    maintenance_open: 1,
    quality_nc_open: 0,
    primary_bottleneck_line: 'line_a',
    anomaly_risk: 'normal'
  },
  oee_context: { weighted_oee: 78.5, stability_index: 85, line_contexts: [{ line_identifier: 'line_a' }] },
  bottlenecks: { primary_line: 'line_a', top_score: 42, heatmap: [{ line_identifier: 'line_a' }] },
  telemetry: { telemetry_integrity: 'ok' },
  raw: { lines: [{ line_identifier: 'line_a' }], monitored: { total: 5, critical: 1 } }
};

const SHADOW_BLOCKS = [
  'production.oee_contextual',
  'production.throughput_monitor',
  'production.bottleneck_heatmap',
  'production.downtime_analysis',
  'production.telemetry_center',
  'production.operational_ai',
  'production.production_narrative'
].map((id) => ({
  block_id: id,
  label: id,
  semantic_layer: 'operational',
  enriched: true
}));

const PILOT = {
  pilot_skipped: false,
  shadow_cognitive_cockpit: { blocks: SHADOW_BLOCKS, block_count: SHADOW_BLOCKS.length },
  engine_bridge: { binding_ratio: 0.85, telemetry_readiness: 'ready' }
};

const PAYLOAD = {
  profile_code: 'coordinator_production',
  functional_area: 'production',
  functional_axis: 'production',
  cognitive_render_promotion: { promotion_applied: true, render_active: true },
  widgets_promoted: [
    { id: 'kpi_cards', render_promoted: true },
    { id: 'grafico_tendencia', render_promoted: true },
    { id: 'alertas', render_promoted: true }
  ]
};

async function testRegistry() {
  console.log('\n=== Production block registry ===');
  resetCache();
  const reg = require('../../src/cognitiveRuntime/registry/cognitiveBlockRegistry');
  assert(reg.getBlockById('production.oee_contextual')?.domain === 'production', 'oee block domain');
  assert(reg.getBlockById('production.line_oee')?.id === 'production.oee_contextual', 'line_oee alias');
  const stats = reg.getRegistryStats();
  assert(stats.production_pilot_blocks === 16, '16 production blocks');
}

async function testOeeEngine() {
  console.log('\n=== OEE context engine ===');
  const { buildOeeContext } = require('../../src/cognitiveRuntime/domains/production/telemetry/productionOeeContextEngine');
  const ctx = buildOeeContext(
    [{ line_identifier: 'L1', produced_qty: 80, target_qty: 100, efficiency_pct: 80 }],
    [{ line_identifier: 'L1', scrap_qty: 5 }]
  );
  assert(ctx.weighted_oee != null, 'weighted oee');
  assert(ctx.line_contexts.length === 1, 'line context');
}

async function testBottleneck() {
  console.log('\n=== Bottleneck analysis ===');
  const { analyzeBottlenecks } = require('../../src/cognitiveRuntime/domains/production/telemetry/bottleneckAnalysisEngine');
  const bn = analyzeBottlenecks(
    [{ line_identifier: 'L1', produced_qty: 40, target_qty: 100 }],
    []
  );
  assert(bn.primary_line === 'L1', 'primary bottleneck');
}

async function testTelemetryRuntime() {
  console.log('\n=== Telemetry runtime ===');
  const bridge = require('../../src/cognitiveRuntime/domains/production/telemetry/productionTelemetryBridge');
  const out = await bridge.bridgeProductionTelemetry({}, { mock_signals: MOCK_SIGNALS });
  assert(out.readiness === 'ready', 'telemetry bridge readiness');
}

async function testSemanticIsolation() {
  console.log('\n=== Production semantic isolation ===');
  resetCache();
  const v = require('../../src/cognitiveRuntime/domains/production/runtime/productionSemanticValidator');
  assert(v.validateProductionSemanticPayload(PAYLOAD, [{ summary: 'OEE throughput gargalo' }]).ok, 'production ok');
  assert(v.validateProductionSemanticPayload({ summary: 'turnover absenteismo RH' }, []).ok === false, 'blocks hr');
  assert(v.validateProductionSemanticPayload({ summary: 'ebitda margem boardroom' }, []).ok === false, 'blocks executive');
}

async function testDensity() {
  console.log('\n=== Production density governor ===');
  resetCache();
  const dg = require('../../src/cognitiveRuntime/domains/production/runtime/productionDensityGovernor');
  const centers = Array.from({ length: 10 }, (_, i) => ({
    center_id: `c${i}`,
    layer: 'operational',
    weight: 0.1,
    render_slot: 'kpi_cards'
  }));
  const widgets = Array.from({ length: 12 }, (_, i) => ({ id: `w${i}` }));
  const out = dg.applyProductionDensityGovernor(centers, widgets);
  assert(out.centers.length <= 6, 'max 6 centers');
  assert(out.widgets.length <= 8, 'max 8 widgets');
}

async function testConsolidation() {
  console.log('\n=== Production consolidation ===');
  resetCache();
  const { consolidateProductionCockpit } = require('../../src/cognitiveRuntime/domains/production/cockpit/productionCockpitConsolidator');
  const user = { company_id: '00000000-0000-4000-8000-000000000099' };
  const out = await consolidateProductionCockpit(user, PAYLOAD, { mock_signals: MOCK_SIGNALS }, PILOT);
  assert(out.consolidation_applied === true, 'consolidation applied');
  assert(out.cockpit_mode === 'production_native', 'production native mode');
  assert(out.centers.length <= 6, 'density centers');
  assert(out.semantic_validation?.ok !== false, 'semantic ok');
}

async function testKpiAdapter() {
  console.log('\n=== Production native KPIs ===');
  resetCache();
  const kpi = require('../../src/cognitiveRuntime/domains/production/kpi/productionNativeKpiAdapter');
  assert(kpi.isProductionNativeKpiProfile('coordinator_production', 'production'), 'pilot profile');
  const kpis = await kpi.buildProductionNativeKpis({}, { mock_signals: MOCK_SIGNALS });
  assert(kpis.some((k) => k.key === 'production_oee_contextual'), 'oee kpi');
  assert(!kpis.some((k) => /ebitda/i.test(k.title)), 'no ebitda');
}

async function testDomainRegistry() {
  console.log('\n=== Domain registry production native ===');
  resetCache();
  const dr = require('../../src/cognitiveRuntime/domainFoundation/registry/cognitiveDomainRegistry');
  const def = dr.getDomainDefinition('production');
  assert(def.cockpit_ready === true, 'cockpit_ready');
  assert(def.maturity === 'native', 'maturity native');
}

async function main() {
  console.log('Z.P0 Production Native Cockpit Tests');
  await testRegistry();
  await testOeeEngine();
  await testBottleneck();
  await testTelemetryRuntime();
  await testSemanticIsolation();
  await testDensity();
  await testConsolidation();
  await testKpiAdapter();
  await testDomainRegistry();
  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
