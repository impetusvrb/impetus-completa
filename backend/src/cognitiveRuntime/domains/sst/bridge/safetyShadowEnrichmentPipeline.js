'use strict';

const flagsZ25 = require('../../../config/phaseZ25FeatureFlags');
const { logPhaseZ25 } = require('../../../phaseZ25Logger');
const { loadSafetyTenantSignals } = require('./safetySignalLoader');
const { invokeSafetyBlockBridge, buildSafetyEngineContext } = require('./safetyEngineBridge');
const { buildBindingValidationReport } = require('../../../observability/bindingValidationReport');

async function enrichSafetyShadowCockpit(shadowCockpit = {}, user = {}, payload = {}, ctx = {}) {
  if (!flagsZ25.isSafetyCognitiveRuntimeActive() && !flagsZ25.isSafetyCognitiveRuntimeShadow()) {
    return { shadow_cockpit: shadowCockpit, enrichment_skipped: true, reason: 'safety_runtime_off' };
  }
  if (!shadowCockpit?.blocks?.length) {
    return { shadow_cockpit: shadowCockpit, enrichment_skipped: true, reason: 'no_blocks' };
  }

  const signalBundle = await loadSafetyTenantSignals(user, {
    ...ctx,
    tenant_id: user?.company_id,
    mock_signals: ctx.mock_signals
  });

  const bridgeCtx = {
    tenant_id: user?.company_id,
    user_id: user?.id,
    correlation_id: ctx.correlation_id
  };

  const bindings = [];
  const enrichedBlocks = [];

  for (const block of shadowCockpit.blocks) {
    const binding = invokeSafetyBlockBridge(block.block_id, signalBundle, bridgeCtx);
    bindings.push({ ...binding, block_id: block.block_id });
    enrichedBlocks.push({
      ...block,
      enriched: binding.bridge_status === 'bound_z25',
      shadow_signals: { ...block.shadow_signals, ...binding, bridge_status: binding.bridge_status }
    });
  }

  bridgeCtx._engine_context = buildSafetyEngineContext(signalBundle, bindings);
  for (const blockId of ['sst.safety_narrative', 'sst.safety_ai']) {
    const idx = enrichedBlocks.findIndex((b) => b.block_id === blockId);
    if (idx >= 0) {
      const rebinding = invokeSafetyBlockBridge(blockId, signalBundle, bridgeCtx);
      enrichedBlocks[idx].shadow_signals = { ...enrichedBlocks[idx].shadow_signals, ...rebinding };
      bindings[idx] = { ...rebinding, block_id: blockId };
    }
  }

  const bound = bindings.filter((b) => b.bridge_status === 'bound_z25').length;
  const bindingRatio = bindings.length ? bound / bindings.length : 0;

  logPhaseZ25('SAFETY_SHADOW_ENRICHED', {
    tenant_id: user?.company_id,
    profile: payload.profile_code,
    blocks_bound: bound,
    binding_ratio: Math.round(bindingRatio * 1000) / 1000
  });

  return {
    shadow_cockpit: { ...shadowCockpit, blocks: enrichedBlocks, enrichment_phase: 'Z.25' },
    enrichment_skipped: false,
    engine_bridge: {
      binding_ratio: bindingRatio,
      blocks_bound: bound,
      blocks_empty: bindings.length - bound,
      validation: buildBindingValidationReport(bindings, { domain: 'safety' })
    }
  };
}

module.exports = { enrichSafetyShadowCockpit };
