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
  process.env.IMPETUS_SPECIALIZED_DELIVERY_ENRICH = 'enrich';
  process.env.IMPETUS_KPI_DOMAIN_ADAPTER = 'on';
  process.env.IMPETUS_SHADOW_ENRICHMENT = 'on';
  process.env.IMPETUS_QUALITY_COCKPIT_PILOT = 'shadow';
  process.env.IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const SYNTHETIC_SIGNALS = {
  ok: true,
  operational: { open_nc: 8, total_proposals: 20, sector_breakdown: [{ sector: 'linha_a', count: 5 }] },
  raw: {
    process_values: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    defect_rates: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    recurrence_records: [
      { entity_type: 'proposal', entity_id: 'linha_a', kind: 'nc', occurred_at: new Date().toISOString() },
      { entity_type: 'proposal', entity_id: 'linha_a', kind: 'nc', occurred_at: new Date().toISOString() }
    ],
    supplier_rows: []
  }
};

const LEGACY_KPIS = [
  { id: 'operational_insights', title: 'Insights operacionais', value: 3 },
  { id: 'k2', title: 'Interações do departamento', value: 10 },
  { id: 'open_nc', title: 'Não conformidades', value: 2 }
];

const QUALITY_PAYLOAD = {
  profile_code: 'coordinator_quality',
  functional_area: 'quality',
  functional_axis: 'quality',
  kpis: LEGACY_KPIS,
  profile_config: { cards: [{ id: 'operational_insights' }], widgets: [{ id: 'ai_insights' }] }
};

async function testKpiAdapter() {
  console.log('\n=== Quality KPI adapter ===');
  resetCache();
  const { buildQualitySpecializedKpis, mergeKpisWithLegacy, isGenericKpi } = loadFresh(
    '../../src/cognitiveRuntime/domainAdapters/quality/qualityKpiAdapter'
  );
  const inv = loadFresh('../../src/cognitiveRuntime/bridge/qualityBlockBridgeInvoker');
  const bindings = [
    inv.invokeBlockBridge('quality.nc_center', SYNTHETIC_SIGNALS, {}),
    inv.invokeBlockBridge('quality.spc_monitor', SYNTHETIC_SIGNALS, {})
  ];
  const spec = buildQualitySpecializedKpis(bindings, SYNTHETIC_SIGNALS);
  assert(spec.length >= 2, 'specialized kpis built');
  assert(spec.every((k) => k.specialized === true), 'all specialized flag');
  const merged = mergeKpisWithLegacy(LEGACY_KPIS, spec);
  assert(merged.kpis_specialized.length >= 2, 'specialized list');
  assert(merged.generic_removed_count >= 1, 'generic removed');
  assert(!merged.kpis.some((k, i) => i < spec.length && isGenericKpi(k)), 'specialized first slots');
}

async function testPromotionSupervisor() {
  console.log('\n=== Enrich promotion supervisor ===');
  resetCache();
  const sup = loadFresh('../../src/cognitiveRuntime/domainAdapters/runtime/enrichPromotionSupervisor');
  const ok = sup.evaluatePromotionEligibility(
    {},
    QUALITY_PAYLOAD,
    {},
    { engine_bridge: { binding_ratio: 0.8 } }
  );
  assert(ok.allowed === true, 'promotion allowed');
  assert(ok.enrich_payload === true, 'enrich mode');
}

async function testControlledEnrichment() {
  console.log('\n=== Controlled specialization runtime ===');
  resetCache();
  const pilotMod = loadFresh('../../src/cognitiveRuntime/pilot/qualityCockpitPilot');
  const runtime = loadFresh(
    '../../src/cognitiveRuntime/domainAdapters/runtime/controlledSpecializationRuntime'
  );

  const shadowBlocks = [
    'quality.nc_center',
    'quality.capa_engine',
    'quality.spc_monitor',
    'quality.nonconformity_heatmap',
    'quality.recurrence_analysis',
    'quality.audit_governance'
  ].map((id) => ({
    block_id: id,
    label: id,
    enriched: true,
    shadow_signals: { bridge_status: 'bound_z20', engine_ok: true, metrics: { open_nc: 8 } }
  }));

  const pilot = {
    pilot_active: true,
    shadow_cognitive_cockpit: { blocks: shadowBlocks, block_count: shadowBlocks.length },
    engine_bridge: { binding_ratio: 0.85, blocks_bound: 6 }
  };

  const result = await runtime.applyControlledEnrichment(
    { company_id: 't1' },
    QUALITY_PAYLOAD,
    { force_specialized_enrich: true, mock_signals: SYNTHETIC_SIGNALS },
    pilot
  );

  assert(result.ok === true, 'enrichment ok');
  assert(result.specialized_delivery?.promotion_applied === true, 'promotion applied');
  assert((result.payload.kpis_specialized || []).length >= 2, 'kpis_specialized');
  assert(result.payload.kpis_legacy?.length === LEGACY_KPIS.length, 'legacy preserved');
  assert(result.specialized_delivery?.channels_enriched?.includes('kpis'), 'kpis channel');
  assert(result.payload.profile_config?.specialized_cockpit_hints?.length >= 1, 'cockpit hints');
}

async function testFacadeEnrich() {
  console.log('\n=== Facade Z.21 enrich ===');
  resetCache();
  const facade = loadFresh('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
  const out = await facade.applyCognitiveFoundationToDashboard(
    { company_id: 't1' },
    QUALITY_PAYLOAD,
    { mock_signals: SYNTHETIC_SIGNALS, force_specialized_enrich: true }
  );
  assert((out.payload.kpis_specialized || []).length >= 1, 'facade enriches kpis');
  assert(out.cognitive_runtime_report?.specialized_delivery?.promotion_applied === true, 'report');
  assert(out.payload === out.payload, 'payload returned');
}

async function run() {
  await testKpiAdapter();
  await testPromotionSupervisor();
  await testControlledEnrichment();
  await testFacadeEnrich();
  console.log(`\n=== Z.21 Specialized Delivery: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
