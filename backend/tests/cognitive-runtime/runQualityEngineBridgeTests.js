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
  process.env.IMPETUS_SHADOW_ENRICHMENT = 'on';
  process.env.IMPETUS_QUALITY_ENGINE_BRIDGE = 'shadow';
  process.env.IMPETUS_QUALITY_BRIDGE_DIRECT_ENGINES = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const SYNTHETIC_SIGNALS = {
  ok: true,
  operational: { open_nc: 12, total_proposals: 40, sector_breakdown: [{ sector: 'linha_a', count: 5 }] },
  raw: {
    process_values: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    defect_rates: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    recurrence_records: [
      { entity_type: 'proposal', entity_id: 'linha_a', kind: 'nc', occurred_at: new Date().toISOString() },
      { entity_type: 'proposal', entity_id: 'linha_a', kind: 'nc', occurred_at: new Date(Date.now() - 86400000).toISOString() },
      { entity_type: 'proposal', entity_id: 'linha_b', kind: 'nc', occurred_at: new Date().toISOString() }
    ],
    supplier_rows: []
  }
};

async function testBlockInvoker() {
  console.log('\n=== Block bridge invoker ===');
  resetCache();
  const inv = loadFresh('../../src/cognitiveRuntime/bridge/qualityBlockBridgeInvoker');
  const nc = inv.invokeBlockBridge('quality.nc_center', SYNTHETIC_SIGNALS, { tenant_id: 't1' });
  assert(nc.bridge_status === 'bound_z20', 'nc_center bound');
  assert(nc.engine_invoked === true, 'engine invoked');

  const spc = inv.invokeBlockBridge('quality.spc_monitor', SYNTHETIC_SIGNALS, {});
  assert(spc.bridge_status === 'bound_z20', 'spc bound with series');

  const rec = inv.invokeBlockBridge('quality.recurrence_analysis', SYNTHETIC_SIGNALS, {});
  assert(rec.engine_ok === true, 'recurrence engine ok');

  const sup = inv.invokeBlockBridge('quality.supplier_intelligence', SYNTHETIC_SIGNALS, {});
  assert(sup.bridge_status === 'bound_empty', 'supplier graceful empty');
}

async function testShadowEnrichment() {
  console.log('\n=== Shadow enrichment pipeline ===');
  resetCache();
  const enrich = loadFresh('../../src/cognitiveRuntime/bridge/shadowEnrichmentPipeline');
  const shadow = {
    blocks: [
      { block_id: 'quality.nc_center', shadow_signals: { bridge_status: 'not_invoked_z19' } },
      { block_id: 'quality.spc_monitor', shadow_signals: {} }
    ],
    profile_code: 'coordinator_quality'
  };
  const out = await enrich.enrichShadowCockpit(shadow, { company_id: 't1' }, {}, { mock_signals: SYNTHETIC_SIGNALS });

  assert(!out.enrichment_skipped, 'enrichment runs');
  assert(out.shadow_cockpit.enrichment_applied === true, 'enrichment applied');
  const bound = out.shadow_cockpit.blocks.filter((b) => b.shadow_signals?.bridge_status === 'bound_z20');
  assert(bound.length >= 1, 'at least one block bound');
  assert(out.bridge_validation.binding_ratio > 0, 'binding ratio > 0');
}

async function testComposerAsync() {
  console.log('\n=== Async composer + Z.20 ===');
  resetCache();
  const composer = loadFresh('../../src/cognitiveRuntime/composition/runtimeCockpitComposer');
  const r = await composer.composeRuntimeCockpit(
    { company_id: 't1' },
    { profile_code: 'coordinator_quality', functional_area: 'quality', profile_config: { cards: [], widgets: [] } },
    { hierarchy_tier: 'coordination', mock_signals: SYNTHETIC_SIGNALS }
  );
  assert(!r.skipped, 'composer runs');
  assert(r.enrichment_phase === 'Z.20', 'Z.20 enrichment');
  assert(r.engine_bridge?.blocks_bound >= 1, 'engine bridge report');
  const hasBound = (r.shadow_cognitive_cockpit?.blocks || []).some(
    (b) => b.shadow_signals?.bridge_status === 'bound_z20'
  );
  assert(hasBound, 'shadow block bound_z20');
}

async function run() {
  await testBlockInvoker();
  await testShadowEnrichment();
  await testComposerAsync();
  console.log(`\n=== Z.20 Engine Bridge: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
