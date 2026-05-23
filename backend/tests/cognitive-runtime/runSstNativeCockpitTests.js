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
function loadFresh(p) {
  delete require.cache[require.resolve(p)];
  return require(p);
}
function resetCache() {
  process.env.IMPETUS_SST_NATIVE_COCKPIT = 'pilot';
  process.env.IMPETUS_SAFETY_COGNITIVE_RUNTIME = 'shadow';
  process.env.IMPETUS_SAFETY_RENDER_PROMOTION = 'controlled';
  process.env.IMPETUS_SAFETY_DENSITY_GOVERNOR = 'on';
  process.env.IMPETUS_SST_OBSERVABILITY = 'on';
  process.env.IMPETUS_QUALITY_COCKPIT_PILOT = 'shadow';
  process.env.IMPETUS_COGNITIVE_COMPOSITION_ENGINE = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const MOCK_SIGNALS = {
  ok: true,
  operational: {
    open_incidents: 4,
    near_miss: 2,
    critical_incidents: 1,
    sector_breakdown: [{ sector: 'linha_a', count: 3 }],
    permits_overdue: 2,
    ppe_compliance_pct: 78
  },
  raw: {
    risk_rows: [{ id: 'r1', hazard: 'queda', severity: 4, probability: 3 }],
    weekly_trend: [{ week: 0, total: 2 }]
  }
};

const SHADOW_BLOCKS = [
  'sst.incident_intelligence',
  'sst.permit_governance',
  'sst.ppe_compliance',
  'sst.hazard_heatmap',
  'sst.safety_telemetry',
  'sst.risk_matrix',
  'sst.safety_narrative',
  'sst.safety_ai'
].map((id) => ({
  block_id: id,
  label: id,
  semantic_layer: 'operational',
  enriched: true,
  shadow_signals: { bridge_status: 'bound_z25', metrics: { open_incidents: 4 } }
}));

const PILOT = {
  pilot_skipped: false,
  shadow_cognitive_cockpit: { blocks: SHADOW_BLOCKS, block_count: SHADOW_BLOCKS.length },
  engine_bridge: { binding_ratio: 0.88, blocks_bound: 8 }
};

const PAYLOAD = {
  profile_code: 'coordinator_safety',
  functional_area: 'safety',
  functional_axis: 'safety',
  cognitive_render_promotion: { promotion_applied: true, render_active: true },
  widgets_promoted: [
    { id: 'alertas', render_promoted: true },
    { id: 'kpi_cards', render_promoted: true },
    { id: 'rastreabilidade', render_promoted: true }
  ],
  profile_config: { widgets: [{ id: 'resumo_executivo' }, { id: 'grafico_producao_demanda' }] }
};

function testRegistry() {
  console.log('\n=== SST block registry ===');
  resetCache();
  const reg = loadFresh('../../src/cognitiveRuntime/registry/cognitiveBlockRegistry');
  const b = reg.getBlockById('sst.incident_intelligence');
  assert(b?.domain === 'safety', 'incident block domain');
  const alias = reg.getBlockById('sst.incident_heatmap');
  assert(alias?.id === 'sst.incident_intelligence', 'alias heatmap');
}

function testCenters() {
  console.log('\n=== Safety centers ===');
  resetCache();
  const { buildIncidentIntelligenceCenter } = loadFresh(
    '../../src/cognitiveRuntime/domains/sst/cockpit/incidentIntelligenceCenter'
  );
  const c = buildIncidentIntelligenceCenter(
    [{ block_id: 'sst.incident_intelligence', metrics: { open_incidents: 5 } }],
    { operational: { open_incidents: 5 } }
  );
  assert(c.center_id === 'safety_incident_intelligence', 'incident center');
}

function testSemanticIsolation() {
  console.log('\n=== Semantic isolation ===');
  resetCache();
  const v = loadFresh('../../src/cognitiveRuntime/domains/sst/runtime/safetySemanticValidator');
  const out = v.validateSafetySemanticPayload(PAYLOAD, [{ summary: 'incidentes SST' }]);
  assert(out.ok === true, 'no industrial leak in safety payload');
  const bad = v.validateSafetySemanticPayload({ summary: 'producao total e uptime' }, []);
  assert(bad.ok === false, 'detects industrial bleed');
}

function testHealth() {
  console.log('\n=== Safety cognitive health ===');
  resetCache();
  const h = loadFresh('../../src/cognitiveRuntime/domains/sst/observability/safetyCognitiveHealth');
  const out = h.computeSafetyCognitiveHealth({
    specialized_ratio: 0.7,
    generic_ratio: 0.2,
    operational_focus: 0.75,
    semantic_fidelity: 0.9
  });
  assert(out.safety_cognitive_health?.healthy === true, 'health healthy');
  assert(out.safety_cognitive_health?.specialization >= 0.6, 'specialization score');
}

function testConsolidation() {
  console.log('\n=== Safety consolidation ===');
  resetCache();
  const cons = loadFresh('../../src/cognitiveRuntime/domains/sst/cockpit/safetyCockpitConsolidator');
  return cons
    .consolidateSafetyCockpit({ company_id: 't1' }, PAYLOAD, { mock_signals: MOCK_SIGNALS }, PILOT)
    .then((r) => {
      assert(r.ok === true, 'consolidation ok');
      assert(r.centers.length >= 4, 'centers built');
      assert(r.decision_support?.questions?.length >= 4, 'safety AI questions');
      const exposed = JSON.stringify({
        centers: r.centers,
        widgets: r.widgets,
        questions: r.decision_support?.questions
      });
      assert(!exposed.match(/uptime|ebitda|producao total/i), 'no executive industrial terms in delivery');
    });
}

function testApplicator() {
  console.log('\n=== Safety applicator ===');
  resetCache();
  const app = loadFresh('../../src/cognitiveRuntime/domains/sst/runtime/safetyCockpitConsolidationRuntime');
  return app
    .applySafetyCockpitConsolidation({ company_id: 't1' }, PAYLOAD, { force_safety_consolidation: true }, PILOT)
    .then((r) => {
      assert(r.ok === true, 'applicator ok');
      assert(r.sst_cognitive_runtime?.cockpit_mode === 'safety_native', 'safety_native mode');
      assert(r.payload.safety_cognitive_centers?.length > 0, 'centers on payload');
    });
}

function testDensity() {
  console.log('\n=== Density balancing ===');
  resetCache();
  const d = loadFresh('../../src/cognitiveRuntime/domains/sst/runtime/safetyDensityGovernor');
  const out = d.applySafetyDensityGovernor(
    Array.from({ length: 9 }, (_, i) => ({ center_id: `c${i}`, weight: 0.1 })),
    Array.from({ length: 10 }, (_, i) => ({ id: `w${i}` }))
  );
  assert(out.centers.length <= 6, 'centers capped');
}

async function main() {
  console.log('Z.25 SST Native Cockpit Tests');
  testRegistry();
  testCenters();
  testSemanticIsolation();
  testHealth();
  testDensity();
  await testConsolidation();
  await testApplicator();
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
