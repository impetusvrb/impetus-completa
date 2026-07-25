'use strict';

const { consolidatePpapCockpit } = require('../cockpit/ppapCockpitConsolidator');
const { buildPpapRuntimeDescriptor } = require('../runtime/ppapRuntimeDescriptor');
const { evaluatePpapConsolidationEligibility } = require('../cockpit/ppapConsolidationSupervisor');

/**
 * GF-004 — Z.23 runtime gate ppap_native (consumidor passivo Z.22).
 */
async function applyPpapCockpitConsolidation(user = {}, payload = {}, ctx = {}, ppapPilot = {}) {
  const eligibility = evaluatePpapConsolidationEligibility(payload, ctx, ppapPilot);
  const pilotBinding = ppapPilot?.engine_bridge?.binding_ratio ?? 0;

  if (!eligibility.allowed) {
    return {
      payload,
      ok: false,
      skipped: true,
      reason: eligibility.reason,
      ppap_cognitive_runtime: buildPpapRuntimeDescriptor({
        consolidation_applied: false,
        promotion_applied: payload.cognitive_render_promotion?.promotion_applied === true,
        inactive: true,
        cockpit_mode: 'off',
        reason: eligibility.reason,
        binding_ratio: pilotBinding,
        bound_blocks: eligibility.bound_blocks || ppapPilot?.engine_bridge?.bound_blocks || [],
        missing_blocks: eligibility.missing_blocks || ppapPilot?.engine_bridge?.missing_blocks || [],
        gate_scenario: pilotBinding === 0 ? 'A_NO_DATASET' : 'B_BELOW_THRESHOLD',
        gf: 'GF-004'
      })
    };
  }

  if (eligibility.shadow_only && !ctx.force_ppap_consolidation) {
    const preview = await consolidatePpapCockpit(user, payload, ctx, ppapPilot);
    return {
      payload,
      ok: true,
      shadow_compare_only: true,
      ppap_cockpit_preview: preview,
      ppap_cognitive_runtime: buildPpapRuntimeDescriptor({
        consolidation_applied: false,
        preview_only: true,
        inactive: true,
        binding_ratio: eligibility.binding_ratio
      })
    };
  }

  const consolidated = await consolidatePpapCockpit(user, payload, ctx, ppapPilot);
  const enriched = { ...payload };

  enriched.ppap_cognitive_centers = consolidated.centers || [];
  enriched.widgets_promoted = consolidated.widgets?.length ? consolidated.widgets : enriched.widgets_promoted;
  enriched.cockpit_operational_metrics = enriched.cockpit_operational_metrics || {
    ppap_native: true,
    centers: consolidated.centers?.length ?? 0,
    binding_ratio: consolidated.ppap_cognitive_health?.binding_ratio ?? 0
  };

  const promotionApplied = payload.cognitive_render_promotion?.promotion_applied === true;

  const ppap_cognitive_runtime = buildPpapRuntimeDescriptor({
    consolidation_applied: true,
    promotion_applied: promotionApplied,
    inactive: false,
    cockpit_mode: 'ppap_native',
    centers_count: (consolidated.centers || []).length,
    centers: consolidated.centers,
    bound_blocks: ppapPilot?.engine_bridge?.bound_blocks || [],
    missing_blocks: ppapPilot?.engine_bridge?.missing_blocks || [],
    binding_ratio: consolidated.ppap_cognitive_health?.binding_ratio ?? 0,
    foundation_status: 'promotion_active',
    ppap_cognitive_health: consolidated.ppap_cognitive_health,
    runtime_name: 'ppap_native',
    runtime_id: 'ppap_native',
    gate_scenario: 'C_GATE_PASS',
    gf: 'GF-004'
  });

  enriched.ppap_cognitive_runtime = ppap_cognitive_runtime;
  enriched.ppap_runtime = ppap_cognitive_runtime;

  return {
    payload: enriched,
    ok: true,
    ppap_cognitive_runtime,
    ppap_cockpit_consolidated: consolidated
  };
}

module.exports = { applyPpapCockpitConsolidation };
