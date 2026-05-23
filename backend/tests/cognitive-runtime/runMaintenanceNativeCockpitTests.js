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
  process.env.IMPETUS_MAINTENANCE_NATIVE_COCKPIT = 'pilot';
  process.env.IMPETUS_MAINTENANCE_COGNITIVE_RUNTIME = 'shadow';
  process.env.IMPETUS_MAINTENANCE_RENDER_PROMOTION = 'controlled';
  process.env.IMPETUS_MAINTENANCE_DENSITY_GOVERNOR = 'on';
  process.env.IMPETUS_MAINTENANCE_OBSERVABILITY = 'on';
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
    maintenance_open: 2,
    downtime_minutes: 180,
    downtime_events: 4,
    asset_count: 12,
    critical_assets: 3,
    mtbf_hours_proxy: 180,
    mttr_hours_proxy: 0.75,
    availability_pct: 95.8,
    failure_recurrence: 'elevated',
    stability_score: 82,
    degradation_signals: 1
  },
  raw: {}
};

const PAYLOAD = {
  profile_code: 'coordinator_maintenance',
  functional_area: 'maintenance',
  functional_axis: 'maintenance',
  cognitive_render_promotion: { promotion_applied: true },
  widgets_promoted: [{ id: 'kpi_cards', render_promoted: true }, { id: 'alertas', render_promoted: true }]
};

const PILOT = {
  pilot_skipped: false,
  shadow_cognitive_cockpit: {
    blocks: ['maintenance.asset_health', 'maintenance.mtbf_mttr', 'maintenance.reliability_center'].map((id) => ({
      block_id: id,
      semantic_layer: 'operational'
    }))
  },
  engine_bridge: { binding_ratio: 0.8 }
};

async function testRegistry() {
  console.log('\n=== Maintenance block registry ===');
  resetCache();
  const reg = require('../../src/cognitiveRuntime/registry/cognitiveBlockRegistry');
  assert(reg.getBlockById('maintenance.asset_health')?.domain === 'maintenance', 'asset_health domain');
  assert(reg.getBlockById('maint.asset_health')?.id === 'maintenance.asset_health', 'alias');
  assert(reg.getRegistryStats().maintenance_pilot_blocks === 18, '18 blocks');
}

async function testTelemetry() {
  console.log('\n=== Telemetry & machine cognition ===');
  resetCache();
  const tel = require('../../src/cognitiveRuntime/domains/maintenance/telemetry/maintenanceTelemetryRuntime');
  const out = tel.runMaintenanceTelemetryRuntime(MOCK_SIGNALS);
  assert(out.telemetry_safe === true, 'telemetry safe');
  assert(out.auto_action === false, 'no auto action');
  const health = tel.runMachineHealthRuntime(MOCK_SIGNALS);
  assert(health.asset_health_score != null, 'asset health');
}

async function testReliability() {
  console.log('\n=== Reliability intelligence ===');
  resetCache();
  const rel = require('../../src/cognitiveRuntime/domains/maintenance/reliability/reliabilityIntelligenceRuntime');
  const out = rel.runReliabilityIntelligenceRuntime(MOCK_SIGNALS);
  assert(out.mtbf_hours === 180, 'mtbf from data');
  assert(out.computed_from_real_data === true, 'real data flag');
  assert(out.auto_action === false, 'no auto action');
}

async function testPredictive() {
  console.log('\n=== Predictive governance ===');
  resetCache();
  const pred = require('../../src/cognitiveRuntime/domains/maintenance/predictive/predictiveMaintenanceRuntime');
  const deg = { trend: 'rising', degradation_detected: true };
  const out = pred.runPredictiveMaintenanceRuntime(MOCK_SIGNALS, deg);
  assert(out.supervised_only === true, 'supervised');
  assert(out.auto_maintenance === false, 'no auto maintenance');
  assert(out.auto_order === false, 'no auto order');
  assert(out.auto_shutdown === false, 'no auto shutdown');
}

async function testIsolation() {
  console.log('\n=== Cross-domain isolation ===');
  resetCache();
  const iso = require('../../src/cognitiveRuntime/domains/maintenance/governance/maintenanceIsolationRuntime');
  const out = iso.runMaintenanceIsolationRuntime();
  assert(out.rh_leakage_blocked === true, 'rh blocked');
  assert(out.production_correlation_allowed === true, 'production ok');
}

async function testDensity() {
  console.log('\n=== Density governor ===');
  resetCache();
  const dg = require('../../src/cognitiveRuntime/domains/maintenance/runtime/maintenanceDensityGovernor');
  const out = dg.runMaintenanceDensityGovernor(
    Array.from({ length: 9 }, (_, i) => ({ center_id: `c${i}` })),
    Array.from({ length: 10 }, () => ({ id: 'w' })),
    Array.from({ length: 5 }, () => ({ severity: 'critical' }))
  );
  assert(out.centers.length <= 6, 'max centers');
  assert(out.widgets.length <= 8, 'max widgets');
  assert(out.alerts.length <= 3, 'max alerts');
}

async function testConsolidation() {
  console.log('\n=== Cockpit consolidation ===');
  resetCache();
  const cons = require('../../src/cognitiveRuntime/domains/maintenance/cockpit/maintenanceCockpitConsolidator');
  const out = await cons.consolidateMaintenanceCockpit({ company_id: 1 }, PAYLOAD, { mock_signals: MOCK_SIGNALS }, PILOT);
  assert(out.consolidation_applied === true, 'consolidated');
  assert(out.cockpit_mode === 'maintenance_native', 'maintenance native');
  assert(out.auto_maintenance === false, 'no auto maintenance');
  assert(out.centers.length <= 6, 'density centers');
}

async function testLiveValidation() {
  console.log('\n=== Live validation ===');
  resetCache();
  const lv = require('../../src/cognitiveRuntime/domains/maintenance/liveValidation/maintenanceLiveValidationFacade');
  const consolidated = await require('../../src/cognitiveRuntime/domains/maintenance/cockpit/maintenanceCockpitConsolidator').consolidateMaintenanceCockpit(
    { company_id: 1 },
    PAYLOAD,
    { mock_signals: MOCK_SIGNALS, force_maintenance_live_validation: true },
    PILOT
  );
  const report = await lv.runMaintenanceLiveValidation({ company_id: 1 }, {}, { force_maintenance_live_validation: true }, { consolidated });
  const flags = report.maintenance_live_validation;
  assert(flags?.telemetry_safe === true, 'telemetry_safe');
  assert(flags?.predictive_runtime_stable === true, 'predictive stable');
  assert(flags?.runtime_safe === true, 'runtime safe');
  assert(flags?.overload_detected === false, 'no overload');
}

async function testAi() {
  console.log('\n=== Maintenance AI ===');
  resetCache();
  const ai = require('../../src/cognitiveRuntime/domains/maintenance/ai/maintenanceOperationalAi');
  const rel = require('../../src/cognitiveRuntime/domains/maintenance/reliability/reliabilityIntelligenceRuntime').runReliabilityIntelligenceRuntime(MOCK_SIGNALS);
  const pred = require('../../src/cognitiveRuntime/domains/maintenance/predictive/predictiveMaintenanceRuntime').runPredictiveMaintenanceRuntime(MOCK_SIGNALS, { trend: 'rising' });
  const health = require('../../src/cognitiveRuntime/domains/maintenance/telemetry/maintenanceTelemetryRuntime').runMachineHealthRuntime(MOCK_SIGNALS);
  const out = ai.runMaintenanceOperationalAi(MOCK_SIGNALS, rel, pred, health);
  assert(out.contextual === true, 'contextual');
  assert(out.boardroom_blocked === true, 'no boardroom');
  assert(out.hr_blocked === true, 'no hr');
}

async function run() {
  console.log('Z.M1 Maintenance Native Cognitive Cockpit Tests');
  await testRegistry();
  await testTelemetry();
  await testReliability();
  await testPredictive();
  await testIsolation();
  await testDensity();
  await testConsolidation();
  await testLiveValidation();
  await testAi();
  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
