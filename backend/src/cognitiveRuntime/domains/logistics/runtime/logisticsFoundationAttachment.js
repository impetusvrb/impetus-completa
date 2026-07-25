'use strict';

const { buildLogisticsRuntimeDescriptor } = require('./logisticsRuntimeDescriptor');
const { LOGISTICS_PILOT_BLOCK_IDS } = require('../../../registry/logisticsCognitiveBlockPack');
const flags = require('../../../config/phaseLogisticsNativeFeatureFlags');
const { runLogisticsSignalBinding } = require('../bridge/logisticsSignalBindingRuntime');

/**
 * Anexa signal loader + runtime descriptor.
 * INC-041 — preserva promotion/consolidation quando Z.22/Z.23 já aplicaram.
 */
async function attachLogisticsRuntimeFoundation(user = {}, payload = {}, report = {}) {
  if (flags.isLogisticsFoundationAttachmentEnabled() === false && !payload._force_logistics_foundation) {
    return { payload, report };
  }

  const enriched = { ...payload };
  const alreadyPromoted = enriched.logistics_cognitive_runtime?.consolidation_applied === true;

  if (!Array.isArray(enriched.logistics_cognitive_centers)) {
    enriched.logistics_cognitive_centers = [];
  }

  let bindingResult = null;

  if (!enriched.logistics_signal_loader) {
    try {
      bindingResult = await runLogisticsSignalBinding(user, {
        tenant_id: user?.company_id,
        profile_code: payload.profile_code
      });
    } catch (_) {
      bindingResult = null;
    }

    enriched.logistics_signal_loader = bindingResult
      ? {
          ok: bindingResult.ok,
          binding_ratio: bindingResult.binding_ratio,
          pilot_blocks: bindingResult.pilot_blocks,
          bound_blocks: bindingResult.bound_blocks,
          missing_blocks: bindingResult.missing_blocks,
          block_details: bindingResult.block_details,
          signal_readiness: bindingResult.signal_bundle?.signal_readiness,
          data_sources: bindingResult.signal_bundle?.data_sources || [],
          dataset_inventory: bindingResult.signal_bundle?.datasets || {}
        }
      : {
          ok: false,
          binding_ratio: logisticsPilotBinding(report, enriched),
          pilot_blocks: LOGISTICS_PILOT_BLOCK_IDS.slice(),
          bound_blocks: [],
          missing_blocks: LOGISTICS_PILOT_BLOCK_IDS.map((id) => ({ block_id: id, reason: 'LOADER_ERROR' })),
          signal_readiness: 'error'
        };
  }

  const bindingRatio =
    enriched.logistics_signal_loader?.binding_ratio ??
    enriched.logistics_cognitive_runtime?.binding_ratio ??
    report.logistics_cockpit_pilot?.engine_bridge?.binding_ratio ??
    0;

  if (alreadyPromoted) {
    enriched.logistics_cognitive_runtime = {
      ...enriched.logistics_cognitive_runtime,
      binding_ratio: bindingRatio,
      signal_loader: {
        ok: enriched.logistics_signal_loader?.ok,
        signal_readiness: enriched.logistics_signal_loader?.signal_readiness,
        data_sources: enriched.logistics_signal_loader?.data_sources || []
      }
    };
    enriched.logistics_runtime = enriched.logistics_cognitive_runtime;
  } else {
    enriched.logistics_cognitive_runtime = buildLogisticsRuntimeDescriptor({
      promotion_applied: enriched.cognitive_render_promotion?.promotion_applied === true,
      consolidation_applied: false,
      inactive: true,
      binding_ratio: bindingRatio,
      signal_loader: {
        ok: enriched.logistics_signal_loader?.ok,
        signal_readiness: enriched.logistics_signal_loader?.signal_readiness,
        data_sources: enriched.logistics_signal_loader?.data_sources || []
      },
      foundation_status: 'signal_loader_active'
    });
    enriched.logistics_runtime = enriched.logistics_cognitive_runtime;
  }

  const nextReport = {
    ...report,
    logistics_runtime_foundation: {
      registered: true,
      runtime_id: 'logistics_native',
      active: alreadyPromoted,
      signal_loader_real: true,
      promotion_preserved: alreadyPromoted,
      pilot_block_count: LOGISTICS_PILOT_BLOCK_IDS.length,
      binding_ratio: bindingRatio,
      bound_blocks: enriched.logistics_signal_loader?.bound_blocks?.length ?? 0,
      phase_stack: alreadyPromoted ? 'Z.19-Z.23-promotion' : 'Z.19-Z.20-signals',
      inc: alreadyPromoted ? 'INC-041' : 'INC-040'
    },
    logistics_signal_loader: enriched.logistics_signal_loader
  };

  return { payload: enriched, report: nextReport };
}

function logisticsPilotBinding(report, enriched) {
  return (
    report.logistics_cockpit_pilot?.engine_bridge?.binding_ratio ??
    enriched.logistics_cognitive_runtime?.binding_ratio ??
    0
  );
}

module.exports = { attachLogisticsRuntimeFoundation };
