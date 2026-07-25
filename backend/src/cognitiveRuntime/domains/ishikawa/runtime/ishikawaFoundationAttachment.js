'use strict';

const { buildIshikawaRuntimeDescriptor } = require('./ishikawaRuntimeDescriptor');
const { ISHIKAWA_PILOT_BLOCK_IDS } = require('../../../registry/ishikawaCognitiveBlockPack');
const flags = require('../../../config/phaseIshikawaNativeFeatureFlags');
const { runIshikawaSignalBinding } = require('../bridge/ishikawaSignalBindingRuntime');

/**
 * GF-017 — Anexa signal loader real + runtime descriptor inactivo.
 * Preserva promotion/consolidation quando Z.22/Z.23 já aplicarem (futuro GF-018+).
 */
async function attachIshikawaRuntimeFoundation(user = {}, payload = {}, report = {}) {
  if (flags.isIshikawaFoundationAttachmentEnabled() === false && !payload._force_ishikawa_foundation) {
    return { payload, report };
  }

  const enriched = { ...payload };
  const alreadyPromoted = enriched.ishikawa_cognitive_runtime?.consolidation_applied === true;

  if (!Array.isArray(enriched.ishikawa_cognitive_centers)) {
    enriched.ishikawa_cognitive_centers = [];
  }

  if (!enriched.ishikawa_signal_loader) {
    let bindingResult = null;
    try {
      bindingResult = await runIshikawaSignalBinding(user, {
        tenant_id: user?.company_id,
        profile_code: payload.profile_code
      });
    } catch (_) {
      bindingResult = null;
    }

    enriched.ishikawa_signal_loader = bindingResult
      ? {
          ok: bindingResult.ok,
          inactive: true,
          binding_ratio: bindingResult.binding_ratio,
          pilot_blocks: bindingResult.pilot_blocks,
          bound_blocks: bindingResult.bound_blocks,
          missing_blocks: bindingResult.missing_blocks,
          block_details: bindingResult.block_details,
          signal_readiness: bindingResult.signal_readiness,
          data_sources: bindingResult.data_sources || [],
          dataset_inventory: bindingResult.signal_bundle?.datasets || {}
        }
      : {
          ok: false,
          inactive: true,
          binding_ratio: ishikawaPilotBinding(report, enriched),
          pilot_blocks: ISHIKAWA_PILOT_BLOCK_IDS.slice(),
          bound_blocks: [],
          missing_blocks: ISHIKAWA_PILOT_BLOCK_IDS.map((id) => ({ block_id: id, reason: 'LOADER_ERROR' })),
          signal_readiness: 'NO_DATASET'
        };
  }

  const bindingRatio =
    enriched.ishikawa_signal_loader?.binding_ratio ??
    enriched.ishikawa_cognitive_runtime?.binding_ratio ??
    0;

  const signalReadiness = enriched.ishikawa_signal_loader?.signal_readiness || 'NO_DATASET';

  if (alreadyPromoted) {
    enriched.ishikawa_cognitive_runtime = {
      ...enriched.ishikawa_cognitive_runtime,
      inactive: false,
      promotion_applied: enriched.ishikawa_cognitive_runtime.promotion_applied === true,
      consolidation_applied: true,
      cockpit_mode: enriched.ishikawa_cognitive_runtime.cockpit_mode || 'ishikawa_native',
      binding_ratio: bindingRatio,
      pilot_blocks: enriched.ishikawa_signal_loader?.pilot_blocks || enriched.ishikawa_cognitive_runtime.pilot_blocks || [],
      bound_blocks: enriched.ishikawa_signal_loader?.bound_blocks || enriched.ishikawa_cognitive_runtime.bound_blocks || [],
      missing_blocks: enriched.ishikawa_signal_loader?.missing_blocks || enriched.ishikawa_cognitive_runtime.missing_blocks || [],
      signal_loader: {
        ok: enriched.ishikawa_signal_loader?.ok,
        signal_readiness: signalReadiness,
        data_sources: enriched.ishikawa_signal_loader?.data_sources || []
      },
      foundation_status: 'promotion_active',
      gf: 'GF-018+'
    };
    enriched.ishikawa_runtime = enriched.ishikawa_cognitive_runtime;
  } else {
    enriched.ishikawa_cognitive_runtime = buildIshikawaRuntimeDescriptor({
      promotion_applied: false,
      consolidation_applied: false,
      inactive: true,
      cockpit_mode: 'off',
      binding_ratio: bindingRatio,
      pilot_blocks: enriched.ishikawa_signal_loader?.pilot_blocks || ISHIKAWA_PILOT_BLOCK_IDS.slice(),
      bound_blocks: enriched.ishikawa_signal_loader?.bound_blocks || [],
      missing_blocks: enriched.ishikawa_signal_loader?.missing_blocks || [],
      signal_loader: {
        inactive: true,
        ok: enriched.ishikawa_signal_loader?.ok,
        signal_readiness: signalReadiness,
        data_sources: enriched.ishikawa_signal_loader?.data_sources || []
      },
      foundation_status: 'signal_loader_active'
    });
    enriched.ishikawa_runtime = enriched.ishikawa_cognitive_runtime;
  }

  const nextReport = {
    ...report,
    ishikawa_runtime_foundation: {
      registered: true,
      runtime_id: 'ishikawa_native',
      active: alreadyPromoted,
      signal_loader_real: true,
      signal_loader_stub: false,
      promotion_preserved: alreadyPromoted,
      pilot_block_count: ISHIKAWA_PILOT_BLOCK_IDS.length,
      binding_ratio: bindingRatio,
      bound_blocks: enriched.ishikawa_signal_loader?.bound_blocks?.length ?? 0,
      phase_stack: alreadyPromoted ? 'Z.19-Z.23-promotion' : 'Z.19-Z.20-signals',
      gf: alreadyPromoted ? 'GF-018+' : 'GF-017'
    },
    ishikawa_signal_loader: enriched.ishikawa_signal_loader
  };

  return { payload: enriched, report: nextReport };
}

function ishikawaPilotBinding(report, enriched) {
  return report.ishikawa_cockpit_pilot?.engine_bridge?.binding_ratio ?? enriched.ishikawa_cognitive_runtime?.binding_ratio ?? 0;
}

module.exports = { attachIshikawaRuntimeFoundation };
