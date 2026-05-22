'use strict';

const flagsZ20 = require('../config/phaseZ20FeatureFlags');
const { logPhaseZ20 } = require('../phaseZ20Logger');
const { loadQualityTenantSignals } = require('./qualityTenantSignalLoader');
const { invokeBlockBridge, buildEngineContext } = require('./qualityBlockBridgeInvoker');
const { buildBindingValidationReport } = require('../observability/bindingValidationReport');

/**
 * Enriquece shadow cockpit com dados reais dos engines quality.
 * Não altera payload legacy nem activa render.
 */
async function enrichShadowCockpit(shadowCockpit = {}, user = {}, payload = {}, ctx = {}) {
  if (!flagsZ20.isShadowEnrichmentEnabled() && !flagsZ20.isQualityEngineBridgeEnabled()) {
    return {
      shadow_cockpit: shadowCockpit,
      enrichment_skipped: true,
      reason: 'shadow_enrichment_off'
    };
  }

  if (!shadowCockpit?.blocks?.length) {
    return { shadow_cockpit: shadowCockpit, enrichment_skipped: true, reason: 'no_blocks' };
  }

  const signalBundle = await loadQualityTenantSignals(user, {
    ...ctx,
    tenant_id: user?.company_id,
    user_id: user?.id,
    mock_signals: ctx.mock_signals
  });

  const bridgeCtx = {
    tenant_id: user?.company_id,
    user_id: user?.id,
    correlation_id: ctx.correlation_id,
    _engine_context: { summary: {}, findings: [] }
  };

  const bindings = [];
  const enrichedBlocks = [];

  for (const block of shadowCockpit.blocks) {
    const binding = invokeBlockBridge(block.block_id, signalBundle, bridgeCtx);
    bindings.push({ ...binding, block_id: block.block_id });
    enrichedBlocks.push({
      ...block,
      shadow_signals: {
        ...block.shadow_signals,
        ...binding,
        bridge_status: binding.bridge_status,
        data_status: binding.data_status,
        phase: 'Z.20',
        enrichment_mode: 'shadow_only'
      },
      enriched: binding.bridge_status === 'bound_z20',
      render_active: false
    });
  }

  bridgeCtx._engine_context = buildEngineContext(signalBundle, bindings);

  for (const block of enrichedBlocks) {
    if (block.block_id === 'quality.contextual_quality_ai') {
      const rebinding = invokeBlockBridge(block.block_id, signalBundle, bridgeCtx);
      block.shadow_signals = { ...block.shadow_signals, ...rebinding };
      block.enriched = rebinding.bridge_status === 'bound_z20';
    }
    if (block.block_id === 'quality.quality_narrative') {
      const rebinding = invokeBlockBridge(block.block_id, signalBundle, bridgeCtx);
      block.shadow_signals = { ...block.shadow_signals, ...rebinding };
      if (rebinding.engine_output?.headline) {
        block.narrative_headline = rebinding.engine_output.headline;
      }
      block.enriched = rebinding.bridge_status === 'bound_z20';
    }
  }

  const validation = buildBindingValidationReport(enrichedBlocks, signalBundle);

  const enrichedCockpit = {
    ...shadowCockpit,
    phase: 'Z.20',
    mode: 'shadow_enriched',
    enrichment_applied: true,
    delivery_mutation: false,
    legacy_cockpit_preserved: true,
    blocks: enrichedBlocks,
    bridge_summary: validation,
    signal_load_ok: signalBundle.ok === true
  };

  if (flagsZ20.isBindingValidationEnabled()) {
    logPhaseZ20('SHADOW_COCKPIT_ENRICHED', {
      tenant_id: user?.company_id,
      profile: shadowCockpit.profile_code,
      blocks_bound: validation.blocks_bound,
      blocks_empty: validation.blocks_empty,
      binding_ratio: validation.binding_ratio
    });
  }

  return {
    shadow_cockpit: enrichedCockpit,
    enrichment_skipped: false,
    bridge_validation: validation,
    signal_bundle_meta: {
      ok: signalBundle.ok,
      reason: signalBundle.reason,
      data_sources: signalBundle.data_sources
    }
  };
}

module.exports = {
  enrichShadowCockpit
};
