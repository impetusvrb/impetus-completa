'use strict';

const flagsZ26 = require('../../../config/phaseZ26FeatureFlags');
const { logPhaseZ26 } = require('../../../phaseZ26Logger');
const { loadHrTenantSignals } = require('./hrTenantSignalLoader');
const { invokeHrBlockBridge, buildHrEngineContext } = require('./hrEngineBridge');
const { buildBindingValidationReport } = require('../../../observability/bindingValidationReport');

async function enrichHrShadowCockpit(shadowCockpit = {}, user = {}, payload = {}, ctx = {}) {
  if (!flagsZ26.isHrCognitiveRuntimeActive() && !flagsZ26.isHrCognitiveRuntimeShadow()) {
    return { shadow_cockpit: shadowCockpit, enrichment_skipped: true, reason: 'hr_runtime_off' };
  }
  if (!shadowCockpit?.blocks?.length) {
    return { shadow_cockpit: shadowCockpit, enrichment_skipped: true, reason: 'no_blocks' };
  }

  const signalBundle = await loadHrTenantSignals(user, { ...ctx, mock_signals: ctx.mock_signals });
  const bridgeCtx = { tenant_id: user?.company_id, user_id: user?.id };
  const bindings = [];
  const enrichedBlocks = [];

  for (const block of shadowCockpit.blocks) {
    const binding = invokeHrBlockBridge(block.block_id, signalBundle, bridgeCtx);
    bindings.push({ ...binding, block_id: block.block_id });
    enrichedBlocks.push({
      ...block,
      enriched: binding.bridge_status === 'bound_z26',
      shadow_signals: { ...block.shadow_signals, ...binding, bridge_status: binding.bridge_status }
    });
  }

  bridgeCtx._engine_context = buildHrEngineContext(signalBundle, bindings);
  for (const blockId of ['hr.hr_narrative', 'hr.contextual_hr_ai']) {
    const idx = enrichedBlocks.findIndex((b) => b.block_id === blockId);
    if (idx >= 0) {
      const rebinding = invokeHrBlockBridge(blockId, signalBundle, bridgeCtx);
      enrichedBlocks[idx].shadow_signals = { ...enrichedBlocks[idx].shadow_signals, ...rebinding };
      bindings[idx] = { ...rebinding, block_id: blockId };
    }
  }

  const bound = bindings.filter((b) => b.bridge_status === 'bound_z26').length;
  const bindingRatio = bindings.length ? bound / bindings.length : 0;

  logPhaseZ26('HR_SHADOW_ENRICHED', {
    tenant_id: user?.company_id,
    profile: payload.profile_code,
    blocks_bound: bound,
    binding_ratio: Math.round(bindingRatio * 1000) / 1000
  });

  return {
    shadow_cockpit: { ...shadowCockpit, blocks: enrichedBlocks, enrichment_phase: 'Z.26' },
    enrichment_skipped: false,
    engine_bridge: {
      binding_ratio: bindingRatio,
      blocks_bound: bound,
      blocks_empty: bindings.length - bound,
      validation: buildBindingValidationReport(bindings, { domain: 'hr' })
    }
  };
}

module.exports = { enrichHrShadowCockpit };
