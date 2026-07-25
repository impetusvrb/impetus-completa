'use strict';

/**
 * INC-030 — Reconciliação da cadeia payload ↔ cognitive_runtime_report (quality_native).
 */

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
  process.env.IMPETUS_SPECIALIZED_COCKPIT_RUNTIME = 'quality_native';
  process.env.IMPETUS_QUALITY_NATIVE_COCKPIT = 'on';
  process.env.IMPETUS_COGNITIVE_COCKPIT_BALANCER = 'on';
  process.env.IMPETUS_COCKPIT_DENSITY_GOVERNOR = 'on';
  process.env.IMPETUS_SPECIALIZED_DELIVERY_ENRICH = 'enrich';
  process.env.IMPETUS_COGNITIVE_RENDER_PROMOTION = 'controlled';
  process.env.IMPETUS_QUALITY_RENDER_PROMOTION = 'pilot';
  process.env.IMPETUS_QUALITY_COCKPIT_PILOT = 'active';
  process.env.IMPETUS_QUALITY_ENGINE_BRIDGE = 'active';
  process.env.IMPETUS_SHADOW_ENRICHMENT = 'on';
  process.env.IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY = 'on';
  process.env.IMPETUS_COGNITIVE_COMPOSITION_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const SHADOW_BLOCKS = [
  'quality.nc_center',
  'quality.capa_engine',
  'quality.spc_monitor',
  'quality.nonconformity_heatmap',
  'quality.recurrence_analysis',
  'quality.audit_governance'
].map((id) => ({
  block_id: id,
  label: id,
  semantic_layer: id.includes('audit') ? 'governance' : 'operational',
  enriched: true,
  shadow_signals: { bridge_status: 'bound_z20', metrics: { open_nc: 6 } }
}));

const PILOT = {
  pilot_skipped: false,
  pilot_id: 'quality-pilot-inc030',
  shadow_cognitive_cockpit: { blocks: SHADOW_BLOCKS, block_count: SHADOW_BLOCKS.length },
  engine_bridge: { binding_ratio: 0.875, blocks_bound: 7 },
  composition_score: 0.82
};

const BASE_PAYLOAD = {
  profile_code: 'manager_quality',
  functional_area: 'quality',
  functional_axis: 'quality',
  profile_config: {
    cards: [{ id: 'open_nc', title: 'Não conformidades abertas' }],
    widgets: [{ id: 'qualidade' }, { id: 'kpi_cards' }]
  },
  kpis: [{ label: 'Não conformidades' }],
  governance_freeze_state: { governance_locked: true }
};

async function testShadowOnlyPreservesLegacyWhenNoConsolidation() {
  console.log('\n=== INC-030 shadow_only without Z.23 ===');
  resetCache();
  process.env.IMPETUS_SPECIALIZED_COCKPIT_RUNTIME = 'shadow';
  process.env.IMPETUS_QUALITY_NATIVE_COCKPIT = 'off';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
  const facade = loadFresh('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
  const out = await facade.applyCognitiveFoundationToDashboard(
    { company_id: 't-shadow' },
    BASE_PAYLOAD,
    {}
  );
  assert(out.payload === BASE_PAYLOAD, 'legacy payload preserved when no consolidation');
  assert(
    out.cognitive_runtime_report?.quality_cockpit_pilot?.mode === 'shadow_only',
    'report still shadow_only'
  );
  assert(!out.payload.specialized_cockpit_runtime, 'no runtime on consumer payload');
}

async function testQualityNativeDeliveredOnRootPayload() {
  console.log('\n=== INC-030 quality_native on payload root ===');
  resetCache();
  const facade = loadFresh('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
  const out = await facade.applyCognitiveFoundationToDashboard(
    { company_id: '511f4819-fc48-479e-b11e-49ba4fb9c81b' },
    BASE_PAYLOAD,
    { force_cockpit_consolidation: true, force_render_promotion: true, force_specialized_enrich: true }
  );

  const reportRuntime = out.cognitive_runtime_report?.specialized_cockpit_runtime;
  const payloadRuntime = out.payload?.specialized_cockpit_runtime;

  assert(reportRuntime?.consolidation_applied === true, 'report consolidation_applied');
  assert(payloadRuntime?.consolidation_applied === true, 'payload consolidation_applied');
  assert(payloadRuntime?.cockpit_mode === 'quality_native', 'payload cockpit_mode quality_native');
  assert(
    reportRuntime?.cockpit_mode === payloadRuntime?.cockpit_mode,
    'cockpit_mode identical report vs payload'
  );
  assert(
    (out.payload.quality_cognitive_centers || []).length >= 4,
    'quality_cognitive_centers on payload root'
  );
  assert(
    (out.payload.quality_cognitive_centers || []).length === (reportRuntime?.centers || []).length,
    'centers count matches report runtime'
  );
  assert(out.payload !== BASE_PAYLOAD, 'payload enriched when quality_native delivered');
}

async function testReportAndPayloadRuntimeParity() {
  console.log('\n=== INC-030 report ↔ payload parity ===');
  resetCache();
  const facade = loadFresh('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
  const out = await facade.applyCognitiveFoundationToDashboard(
    { company_id: 't-parity' },
    {
      ...BASE_PAYLOAD,
      cognitive_render_promotion: { promotion_applied: true, render_active: true },
      specialized_delivery: { promotion_applied: true }
    },
    { force_cockpit_consolidation: true, force_render_promotion: true }
  );

  const reportRuntime = out.cognitive_runtime_report?.specialized_cockpit_runtime;
  const payloadRuntime = out.payload?.specialized_cockpit_runtime;

  assert(
    JSON.stringify({
      cockpit_mode: payloadRuntime?.cockpit_mode,
      consolidation_applied: payloadRuntime?.consolidation_applied,
      centers: payloadRuntime?.centers?.map((c) => c.center_id)
    }) ===
      JSON.stringify({
        cockpit_mode: reportRuntime?.cockpit_mode,
        consolidation_applied: reportRuntime?.consolidation_applied,
        centers: reportRuntime?.centers?.map((c) => c.center_id)
      }),
    'runtime fields parity between report and payload'
  );
}

async function run() {
  await testShadowOnlyPreservesLegacyWhenNoConsolidation();
  await testQualityNativeDeliveredOnRootPayload();
  await testReportAndPayloadRuntimeParity();
  console.log(`\n=== INC-030 Runtime Chain Reconciliation: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
