'use strict';

const { loadEnvironmentalTenantSignals } = require('./environmentalSignalLoader');
const { invokeEnvironmentalBlockBridge, buildEnvironmentalEngineContext } = require('./environmentalEngineBridge');
const { ENVIRONMENTAL_PILOT_BLOCK_IDS } = require('../../../registry/environmentalCognitiveBlockPack');

async function enrichEnvironmentalShadowCockpit(shadowCockpit = {}, user = {}, payload = {}, ctx = {}) {
  const signalBundle = await loadEnvironmentalTenantSignals(user, { ...ctx, mock_signals: ctx.mock_signals });
  const bindings = ENVIRONMENTAL_PILOT_BLOCK_IDS.map((id) =>
    invokeEnvironmentalBlockBridge(id, signalBundle, { tenant_id: user?.company_id })
  );
  const bound = bindings.filter((b) => b.ok || b.bridge_status === 'bound_empty');
  const binding_ratio = bound.length / Math.max(ENVIRONMENTAL_PILOT_BLOCK_IDS.length, 1);

  const enrichedBlocks = (shadowCockpit.blocks || []).map((b) => {
    const bridge = bindings.find((x) => x.block_id === b.block_id);
    return { ...b, enriched: true, shadow_signals: bridge || {}, metrics: bridge?.metrics };
  });

  return {
    enrichment_skipped: false,
    shadow_cockpit: { ...shadowCockpit, blocks: enrichedBlocks, environmental_enriched: true },
    engine_bridge: {
      phase: 'P1-ENV',
      binding_ratio,
      telemetry_readiness: signalBundle.telemetry_readiness,
      engine_context: buildEnvironmentalEngineContext(signalBundle, bindings)
    },
    signal_bundle: signalBundle
  };
}

module.exports = { enrichEnvironmentalShadowCockpit };
