'use strict';

const { loadProductionTenantSignals } = require('./productionSignalLoader');
const { invokeProductionBlockBridge, buildProductionEngineContext } = require('./productionEngineBridge');
const { PRODUCTION_PILOT_BLOCK_IDS } = require('../../../registry/productionCognitiveBlockPack');

async function enrichProductionShadowCockpit(shadowCockpit = {}, user = {}, payload = {}, ctx = {}) {
  const signalBundle = await loadProductionTenantSignals(user, { ...ctx, mock_signals: ctx.mock_signals });
  const bindings = PRODUCTION_PILOT_BLOCK_IDS.map((id) =>
    invokeProductionBlockBridge(id, signalBundle, { tenant_id: user?.company_id })
  );
  const bound = bindings.filter((b) => b.ok || b.bridge_status === 'bound_empty');
  const binding_ratio = bound.length / Math.max(PRODUCTION_PILOT_BLOCK_IDS.length, 1);
  const engineContext = buildProductionEngineContext(signalBundle, bindings);

  const enrichedBlocks = (shadowCockpit.blocks || []).map((b) => {
    const bridge = bindings.find((x) => x.block_id === b.block_id);
    return {
      ...b,
      enriched: true,
      shadow_signals: bridge || { bridge_status: 'pending' },
      metrics: bridge?.metrics
    };
  });

  return {
    enrichment_skipped: false,
    shadow_cockpit: { ...shadowCockpit, blocks: enrichedBlocks, production_enriched: true },
    engine_bridge: {
      phase: 'Z.P0',
      binding_ratio,
      bindings_ok: bound.filter((b) => b.ok).length,
      telemetry_readiness: signalBundle.telemetry_readiness,
      engine_context: engineContext
    },
    signal_bundle: signalBundle
  };
}

module.exports = { enrichProductionShadowCockpit };
