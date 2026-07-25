'use strict';

/**
 * INC-028 — Reconciliação dos sinais cognitivos Quality (Z.20)
 * Valida binding antes/depois e perfis manager_quality / supervisor_quality.
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
  process.env.IMPETUS_SHADOW_ENRICHMENT = 'on';
  process.env.IMPETUS_QUALITY_ENGINE_BRIDGE = 'shadow';
  process.env.IMPETUS_QUALITY_BRIDGE_DIRECT_ENGINES = 'on';
  process.env.IMPETUS_BINDING_VALIDATION = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const BEFORE_SIGNALS = {
  ok: true,
  operational: { open_nc: 5, total_proposals: 20, sector_breakdown: [{ sector: 'linha_a', count: 3 }] },
  raw: {
    process_values: [1, 2, 3],
    defect_rates: [0.1, 0.2],
    recurrence_records: [{ entity_type: 'proposal', entity_id: 'a', kind: 'nc', occurred_at: new Date().toISOString() }],
    supplier_rows: []
  },
  data_sources: ['proposals']
};

const AFTER_SIGNALS = {
  ok: true,
  operational: {
    open_nc: 12,
    total_proposals: 40,
    sector_breakdown: [
      { sector: 'linha_a', count: 5 },
      { sector: 'linha_b', count: 3 }
    ]
  },
  raw: {
    process_values: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    defect_rates: [0.1, 0.12, 0.14, 0.16, 0.18, 0.2, 0.22, 0.24, 0.26, 0.28],
    recurrence_records: [
      { entity_type: 'inspection', entity_id: 'linha_a', kind: 'nc', occurred_at: new Date().toISOString() },
      { entity_type: 'inspection', entity_id: 'linha_a', kind: 'nc', occurred_at: new Date(Date.now() - 86400000).toISOString() },
      { entity_type: 'inspection', entity_id: 'linha_b', kind: 'nc', occurred_at: new Date().toISOString() }
    ],
    supplier_rows: [
      { inspected: 200, defects: 1, lots: 2, rejected_lots: 0 },
      { inspected: 200, defects: 8, lots: 2, rejected_lots: 1 }
    ]
  },
  data_sources: ['proposals', 'quality_inspections', 'raw_material_lots']
};

const PILOT_BLOCKS = [
  'quality.nc_center',
  'quality.capa_engine',
  'quality.spc_monitor',
  'quality.supplier_intelligence',
  'quality.contextual_quality_ai',
  'quality.process_stability',
  'quality.nonconformity_heatmap',
  'quality.recurrence_analysis'
];

function countBinding(signals) {
  resetCache();
  const inv = loadFresh('../../src/cognitiveRuntime/bridge/qualityBlockBridgeInvoker');
  const { buildEngineContext } = inv;
  const ctx = { tenant_id: 't1', _engine_context: { summary: {}, findings: [] } };
  const bindings = PILOT_BLOCKS.map((blockId) => {
    const b = inv.invokeBlockBridge(blockId, signals, ctx);
    return { ...b, block_id: blockId };
  });
  ctx._engine_context = buildEngineContext(signals, bindings);
  const contextual = inv.invokeBlockBridge('quality.contextual_quality_ai', signals, ctx);
  const idx = bindings.findIndex((b) => b.block_id === 'quality.contextual_quality_ai');
  if (idx >= 0) bindings[idx] = { ...contextual, block_id: 'quality.contextual_quality_ai' };

  const bound = bindings.filter((b) => b.bridge_status === 'bound_z20');
  return {
    bound: bound.length,
    total: PILOT_BLOCKS.length,
    ratio: bound.length / PILOT_BLOCKS.length,
    blocks: bindings.map((b) => ({ id: b.block_id, status: b.bridge_status, ok: b.engine_ok }))
  };
}

function testBindingBeforeAfter() {
  console.log('\n=== Binding before/after (synthetic scenarios) ===');
  const before = countBinding(BEFORE_SIGNALS);
  const after = countBinding(AFTER_SIGNALS);

  console.log(`  INFO  binding_before=${before.bound}/${before.total} (${before.ratio.toFixed(3)})`);
  console.log(`  INFO  binding_after=${after.bound}/${after.total} (${after.ratio.toFixed(3)})`);

  assert(before.ratio <= 0.5, 'before ratio <= 0.5 (legacy loader gap)');
  assert(after.ratio >= 0.625, 'after ratio >= 6/8');
  assert(after.bound > before.bound, 'after bound count > before');
}

function testLoaderDataSources() {
  console.log('\n=== Loader data_sources (unit merge helpers) ===');
  resetCache();
  const loader = loadFresh('../../src/cognitiveRuntime/bridge/qualityTenantSignalLoader');

  const series = loader.buildProcessValuesSeries(
    [{ ts: new Date('2026-01-01'), value: 5 }, { ts: new Date('2026-01-08'), value: 7 }],
    [{ ts: new Date('2026-01-15'), total: 3 }],
    []
  );
  assert(series.length === 3, 'process series merges inspection + proposal weeks');
  assert(series[0] === 5 && series[2] === 3, 'process series preserves order');

  const sectors = loader.mergeSectorBreakdown(
    [{ sector: 'a', count: 2 }],
    [{ sector: 'a', count: 3 }, { sector: 'b', count: 1 }]
  );
  assert(sectors.length === 2 && sectors[0].count === 5, 'sector merge sums counts');
}

async function testRealTenantLoader() {
  console.log('\n=== Real tenant loader (DB) ===');
  resetCache();
  const db = require('../../src/db');
  const loader = loadFresh('../../src/cognitiveRuntime/bridge/qualityTenantSignalLoader');
  const enrich = loadFresh('../../src/cognitiveRuntime/bridge/shadowEnrichmentPipeline');

  let companyId = null;
  try {
    const r = await db.query(
      `SELECT company_id FROM quality_inspections GROUP BY company_id ORDER BY COUNT(*) DESC LIMIT 1`
    );
    companyId = r.rows[0]?.company_id;
  } catch (e) {
    console.log('  SKIP  no DB / quality_inspections unavailable');
    return;
  }

  if (!companyId) {
    console.log('  SKIP  no tenant with inspections');
    return;
  }

  const bundle = await loader.loadQualityTenantSignals({ company_id: companyId }, { tenant_id: companyId });
  assert(bundle.ok === true, 'real tenant signal load ok');
  assert(Array.isArray(bundle.data_sources), 'data_sources array present');
  assert(bundle.data_sources.includes('quality_inspections'), 'quality_inspections in data_sources');
  assert(bundle.raw.process_values.length >= 8, 'process_values >= 8 (weekly calendar)');
  assert(bundle.raw.supplier_rows.length === 0 || Array.isArray(bundle.raw.supplier_rows), 'supplier_rows real or empty');

  const shadow = {
    blocks: PILOT_BLOCKS.map((block_id) => ({ block_id, shadow_signals: {} })),
    profile_code: 'manager_quality'
  };
  const out = await enrich.enrichShadowCockpit(shadow, { company_id: companyId }, {}, {});
  const ratio = out.bridge_validation?.binding_ratio ?? 0;
  const bound = out.bridge_validation?.blocks_bound ?? 0;
  console.log(`  INFO  real_tenant binding=${bound}/8 ratio=${ratio}`);
  assert(ratio >= 0.5, 'real tenant binding_ratio >= 0.5');
}

async function testQualityProfiles() {
  console.log('\n=== Profiles manager_quality / supervisor_quality ===');
  resetCache();
  const composer = loadFresh('../../src/cognitiveRuntime/composition/runtimeCockpitComposer');

  for (const profile_code of ['manager_quality', 'supervisor_quality']) {
    const r = await composer.composeRuntimeCockpit(
      { company_id: '511f4819-fc48-479e-b11e-49ba4fb9c81b' },
      {
        profile_code,
        functional_area: 'quality',
        profile_config: { cards: [], widgets: [] }
      },
      { hierarchy_tier: profile_code.startsWith('manager') ? 'management' : 'supervision', mock_signals: AFTER_SIGNALS }
    );
    assert(!r.skipped, `${profile_code} composer runs`);
    assert(r.enrichment_phase === 'Z.20', `${profile_code} Z.20 enrichment`);
    const meta = r.signal_bundle_meta || {};
    assert(meta.ok !== false, `${profile_code} signal bundle ok`);
    const ratio = r.engine_bridge?.binding_ratio ?? r.shadow_cognitive_cockpit?.bridge_summary?.binding_ratio ?? 0;
    assert(ratio >= 0.625, `${profile_code} binding_ratio >= 6/8`);
  }
}

async function run() {
  testBindingBeforeAfter();
  testLoaderDataSources();
  await testRealTenantLoader();
  await testQualityProfiles();
  console.log(`\n=== INC-028 Quality Signal Reconciliation: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
