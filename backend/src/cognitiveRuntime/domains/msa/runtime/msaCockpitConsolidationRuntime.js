'use strict';

const { consolidateMsaCockpit } = require('../cockpit/msaCockpitConsolidator');
const { buildMsaRuntimeDescriptor } = require('./msaRuntimeDescriptor');
const { evaluateMsaConsolidationEligibility } = require('../cockpit/msaConsolidationSupervisor');

/**
 * GF-011 — Z.23 runtime gate msa_native (consumidor passivo Z.22).
 */
async function applyMsaCockpitConsolidation(user = {}, payload = {}, ctx = {}, msaPilot = {}) {
  const eligibility = evaluateMsaConsolidationEligibility(payload, ctx, msaPilot);
  const pilotBinding = msaPilot?.engine_bridge?.binding_ratio ?? 0;

  if (!eligibility.allowed) {
    return {
      payload,
      ok: false,
      skipped: true,
      reason: eligibility.reason,
      msa_cognitive_runtime: buildMsaRuntimeDescriptor({
        consolidation_applied: false,
        promotion_applied: payload.cognitive_render_promotion?.promotion_applied === true,
        inactive: true,
        cockpit_mode: 'off',
        reason: eligibility.reason,
        binding_ratio: pilotBinding,
        bound_blocks: eligibility.bound_blocks || msaPilot?.engine_bridge?.bound_blocks || [],
        missing_blocks: eligibility.missing_blocks || msaPilot?.engine_bridge?.missing_blocks || [],
        gate_scenario: pilotBinding === 0 ? 'A_NO_DATASET' : 'B_BELOW_THRESHOLD',
        gf: 'GF-011'
      })
    };
  }

  if (eligibility.shadow_only && !ctx.force_msa_consolidation) {
    const preview = await consolidateMsaCockpit(user, payload, ctx, msaPilot);
    return {
      payload,
      ok: true,
      shadow_compare_only: true,
      msa_cockpit_preview: preview,
      msa_cognitive_runtime: buildMsaRuntimeDescriptor({
        consolidation_applied: false,
        preview_only: true,
        inactive: true,
        binding_ratio: eligibility.binding_ratio
      })
    };
  }

  const consolidated = await consolidateMsaCockpit(user, payload, ctx, msaPilot);
  const enriched = { ...payload };

  enriched.msa_cognitive_centers = consolidated.centers || [];
  enriched.widgets_promoted = consolidated.widgets?.length ? consolidated.widgets : enriched.widgets_promoted;
  enriched.cockpit_operational_metrics = enriched.cockpit_operational_metrics || {
    msa_native: true,
    centers: consolidated.centers?.length ?? 0,
    binding_ratio: consolidated.msa_cognitive_health?.binding_ratio ?? 0
  };

  const promotionApplied = payload.cognitive_render_promotion?.promotion_applied === true;

  const msa_cognitive_runtime = buildMsaRuntimeDescriptor({
    consolidation_applied: true,
    promotion_applied: promotionApplied,
    inactive: false,
    cockpit_mode: 'msa_native',
    centers_count: (consolidated.centers || []).length,
    centers: consolidated.centers,
    bound_blocks: msaPilot?.engine_bridge?.bound_blocks || [],
    missing_blocks: msaPilot?.engine_bridge?.missing_blocks || [],
    binding_ratio: consolidated.msa_cognitive_health?.binding_ratio ?? 0,
    foundation_status: 'promotion_active',
    msa_cognitive_health: consolidated.msa_cognitive_health,
    runtime_name: 'msa_native',
    runtime_id: 'msa_native',
    gate_scenario: 'C_GATE_PASS',
    gf: 'GF-011'
  });

  enriched.msa_cognitive_runtime = msa_cognitive_runtime;
  enriched.msa_runtime = msa_cognitive_runtime;

  return {
    payload: enriched,
    ok: true,
    msa_cognitive_runtime,
    msa_cockpit_consolidated: consolidated
  };
}

module.exports = { applyMsaCockpitConsolidation };
