'use strict';

const { buildMsaRuntimeDescriptor } = require('./msaRuntimeDescriptor');
const { MSA_PILOT_BLOCK_IDS } = require('../../../registry/msaCognitiveBlockPack');
const flags = require('../../../config/phaseMsaNativeFeatureFlags');
const { runMsaSignalBinding } = require('../bridge/msaSignalBindingRuntime');

/**
 * GF-010 — Anexa signal loader real + runtime descriptor inactivo.
 * Preserva promotion/consolidation quando Z.22/Z.23 já aplicarem (futuro).
 */
async function attachMsaRuntimeFoundation(user = {}, payload = {}, report = {}) {
  if (flags.isMsaFoundationAttachmentEnabled() === false && !payload._force_msa_foundation) {
    return { payload, report };
  }

  const enriched = { ...payload };
  const alreadyPromoted = enriched.msa_cognitive_runtime?.consolidation_applied === true;

  if (!Array.isArray(enriched.msa_cognitive_centers)) {
    enriched.msa_cognitive_centers = [];
  }

  let bindingResult = null;

  if (!enriched.msa_signal_loader) {
    try {
      bindingResult = await runMsaSignalBinding(user, {
        tenant_id: user?.company_id,
        profile_code: payload.profile_code
      });
    } catch (_) {
      bindingResult = null;
    }

    enriched.msa_signal_loader = bindingResult
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
          binding_ratio: msaPilotBinding(report, enriched),
          pilot_blocks: MSA_PILOT_BLOCK_IDS.slice(),
          bound_blocks: [],
          missing_blocks: MSA_PILOT_BLOCK_IDS.map((id) => ({ block_id: id, reason: 'LOADER_ERROR' })),
          signal_readiness: 'NO_DATASET'
        };
  }

  const bindingRatio =
    enriched.msa_signal_loader?.binding_ratio ??
    enriched.msa_cognitive_runtime?.binding_ratio ??
    0;

  const signalReadiness = enriched.msa_signal_loader?.signal_readiness || 'NO_DATASET';

  if (alreadyPromoted) {
    enriched.msa_cognitive_runtime = {
      ...enriched.msa_cognitive_runtime,
      inactive: false,
      promotion_applied: enriched.msa_cognitive_runtime.promotion_applied === true,
      consolidation_applied: true,
      cockpit_mode: enriched.msa_cognitive_runtime.cockpit_mode || 'msa_native',
      binding_ratio: bindingRatio,
      pilot_blocks: enriched.msa_signal_loader?.pilot_blocks || enriched.msa_cognitive_runtime.pilot_blocks || [],
      bound_blocks: enriched.msa_signal_loader?.bound_blocks || enriched.msa_cognitive_runtime.bound_blocks || [],
      missing_blocks: enriched.msa_signal_loader?.missing_blocks || enriched.msa_cognitive_runtime.missing_blocks || [],
      signal_loader: {
        ok: enriched.msa_signal_loader?.ok,
        signal_readiness: signalReadiness,
        data_sources: enriched.msa_signal_loader?.data_sources || []
      },
      foundation_status: 'promotion_active',
      gf: 'GF-013'
    };
    enriched.msa_runtime = enriched.msa_cognitive_runtime;
  } else {
    enriched.msa_cognitive_runtime = buildMsaRuntimeDescriptor({
      promotion_applied: false,
      consolidation_applied: false,
      inactive: true,
      cockpit_mode: 'off',
      binding_ratio: bindingRatio,
      pilot_blocks: enriched.msa_signal_loader?.pilot_blocks || MSA_PILOT_BLOCK_IDS.slice(),
      bound_blocks: enriched.msa_signal_loader?.bound_blocks || [],
      missing_blocks: enriched.msa_signal_loader?.missing_blocks || [],
      signal_loader: {
        inactive: true,
        ok: enriched.msa_signal_loader?.ok,
        signal_readiness: signalReadiness,
        data_sources: enriched.msa_signal_loader?.data_sources || []
      },
      foundation_status: 'signal_loader_active'
    });
    enriched.msa_runtime = enriched.msa_cognitive_runtime;
  }

  const nextReport = {
    ...report,
    msa_runtime_foundation: {
      registered: true,
      runtime_id: 'msa_native',
      active: alreadyPromoted,
      signal_loader_real: true,
      signal_loader_stub: false,
      promotion_preserved: alreadyPromoted,
      pilot_block_count: MSA_PILOT_BLOCK_IDS.length,
      binding_ratio: bindingRatio,
      bound_blocks: enriched.msa_signal_loader?.bound_blocks?.length ?? 0,
      phase_stack: alreadyPromoted ? 'Z.19-Z.23-promotion' : 'Z.19-Z.20-signals',
      gf: alreadyPromoted ? 'GF-011+' : 'GF-010'
    },
    msa_signal_loader: enriched.msa_signal_loader
  };

  return { payload: enriched, report: nextReport };
}

function msaPilotBinding(report, enriched) {
  return report.msa_cockpit_pilot?.engine_bridge?.binding_ratio ?? enriched.msa_cognitive_runtime?.binding_ratio ?? 0;
}

module.exports = { attachMsaRuntimeFoundation };
