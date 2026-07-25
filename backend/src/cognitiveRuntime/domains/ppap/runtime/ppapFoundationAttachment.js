'use strict';

const { buildPpapRuntimeDescriptor } = require('./ppapRuntimeDescriptor');
const { PPAP_PILOT_BLOCK_IDS } = require('../../../registry/ppapCognitiveBlockPack');
const flags = require('../../../config/phasePpapNativeFeatureFlags');
const { runPpapSignalBinding } = require('../bridge/ppapSignalBindingRuntime');

/**
 * GF-003 — Anexa signal loader real + runtime descriptor inactivo.
 * Preserva promotion/consolidation quando Z.22/Z.23 já aplicaram (futuro).
 */
async function attachPpapRuntimeFoundation(user = {}, payload = {}, report = {}) {
  if (flags.isPpapFoundationAttachmentEnabled() === false && !payload._force_ppap_foundation) {
    return { payload, report };
  }

  const enriched = { ...payload };
  const alreadyPromoted = enriched.ppap_cognitive_runtime?.consolidation_applied === true;

  if (!Array.isArray(enriched.ppap_cognitive_centers)) {
    enriched.ppap_cognitive_centers = [];
  }

  let bindingResult = null;

  if (!enriched.ppap_signal_loader) {
    try {
      bindingResult = await runPpapSignalBinding(user, {
        tenant_id: user?.company_id,
        profile_code: payload.profile_code
      });
    } catch (_) {
      bindingResult = null;
    }

    enriched.ppap_signal_loader = bindingResult
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
          binding_ratio: ppapPilotBinding(report, enriched),
          pilot_blocks: PPAP_PILOT_BLOCK_IDS.slice(),
          bound_blocks: [],
          missing_blocks: PPAP_PILOT_BLOCK_IDS.map((id) => ({ block_id: id, reason: 'LOADER_ERROR' })),
          signal_readiness: 'NO_DATASET'
        };
  }

  const bindingRatio =
    enriched.ppap_signal_loader?.binding_ratio ??
    enriched.ppap_cognitive_runtime?.binding_ratio ??
    0;

  const signalReadiness = enriched.ppap_signal_loader?.signal_readiness || 'NO_DATASET';

  if (alreadyPromoted) {
    enriched.ppap_cognitive_runtime = {
      ...enriched.ppap_cognitive_runtime,
      inactive: false,
      promotion_applied: enriched.ppap_cognitive_runtime.promotion_applied === true,
      consolidation_applied: true,
      cockpit_mode: enriched.ppap_cognitive_runtime.cockpit_mode || 'ppap_native',
      binding_ratio: bindingRatio,
      pilot_blocks: enriched.ppap_signal_loader?.pilot_blocks || enriched.ppap_cognitive_runtime.pilot_blocks || [],
      bound_blocks: enriched.ppap_signal_loader?.bound_blocks || enriched.ppap_cognitive_runtime.bound_blocks || [],
      missing_blocks: enriched.ppap_signal_loader?.missing_blocks || enriched.ppap_cognitive_runtime.missing_blocks || [],
      signal_loader: {
        ok: enriched.ppap_signal_loader?.ok,
        signal_readiness: signalReadiness,
        data_sources: enriched.ppap_signal_loader?.data_sources || []
      },
      foundation_status: 'promotion_active',
      gf: 'GF-006'
    };
    enriched.ppap_runtime = enriched.ppap_cognitive_runtime;
  } else {
    enriched.ppap_cognitive_runtime = buildPpapRuntimeDescriptor({
      promotion_applied: false,
      consolidation_applied: false,
      inactive: true,
      cockpit_mode: 'off',
      binding_ratio: bindingRatio,
      pilot_blocks: enriched.ppap_signal_loader?.pilot_blocks || PPAP_PILOT_BLOCK_IDS.slice(),
      bound_blocks: enriched.ppap_signal_loader?.bound_blocks || [],
      missing_blocks: enriched.ppap_signal_loader?.missing_blocks || [],
      signal_loader: {
        inactive: true,
        ok: enriched.ppap_signal_loader?.ok,
        signal_readiness: signalReadiness,
        data_sources: enriched.ppap_signal_loader?.data_sources || []
      },
      foundation_status: 'signal_loader_active'
    });
    enriched.ppap_runtime = enriched.ppap_cognitive_runtime;
  }

  const nextReport = {
    ...report,
    ppap_runtime_foundation: {
      registered: true,
      runtime_id: 'ppap_native',
      active: alreadyPromoted,
      signal_loader_real: true,
      signal_loader_stub: false,
      promotion_preserved: alreadyPromoted,
      pilot_block_count: PPAP_PILOT_BLOCK_IDS.length,
      binding_ratio: bindingRatio,
      bound_blocks: enriched.ppap_signal_loader?.bound_blocks?.length ?? 0,
      phase_stack: alreadyPromoted ? 'Z.19-Z.23-promotion' : 'Z.19-Z.20-signals',
      gf: alreadyPromoted ? 'GF-004+' : 'GF-003'
    },
    ppap_signal_loader: enriched.ppap_signal_loader
  };

  return { payload: enriched, report: nextReport };
}

function ppapPilotBinding(report, enriched) {
  return report.ppap_cockpit_pilot?.engine_bridge?.binding_ratio ?? enriched.ppap_cognitive_runtime?.binding_ratio ?? 0;
}

module.exports = { attachPpapRuntimeFoundation };
