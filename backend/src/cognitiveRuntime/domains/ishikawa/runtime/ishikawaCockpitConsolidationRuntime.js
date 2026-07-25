'use strict';

const { consolidateIshikawaCockpit } = require('../cockpit/ishikawaCockpitConsolidator');
const { buildIshikawaRuntimeDescriptor } = require('./ishikawaRuntimeDescriptor');
const { evaluateIshikawaConsolidationEligibility } = require('../cockpit/ishikawaConsolidationSupervisor');
const { logIshikawaPromotion } = require('../../../renderPromotion/ishikawa/ishikawaPromotionLogger');

/**
 * GF-018 — Z.23 runtime gate ishikawa_native (consumidor passivo Z.22).
 */
async function applyIshikawaCockpitConsolidation(user = {}, payload = {}, ctx = {}, ishikawaPilot = {}) {
  const eligibility = evaluateIshikawaConsolidationEligibility(payload, ctx, ishikawaPilot);
  const pilotBinding = ishikawaPilot?.engine_bridge?.binding_ratio ?? 0;

  if (!eligibility.allowed) {
    logIshikawaPromotion('Z23_SKIPPED', {
      reason: eligibility.reason,
      binding_ratio: pilotBinding,
      min_required: eligibility.min_required,
      gate_scenario: pilotBinding === 0 ? 'A_NO_DATASET' : 'B_BELOW_THRESHOLD'
    });
    return {
      payload,
      ok: false,
      skipped: true,
      reason: eligibility.reason,
      ishikawa_cognitive_runtime: buildIshikawaRuntimeDescriptor({
        consolidation_applied: false,
        promotion_applied: payload.cognitive_render_promotion?.promotion_applied === true,
        inactive: true,
        cockpit_mode: 'off',
        reason: eligibility.reason,
        binding_ratio: pilotBinding,
        bound_blocks: eligibility.bound_blocks || ishikawaPilot?.engine_bridge?.bound_blocks || [],
        missing_blocks: eligibility.missing_blocks || ishikawaPilot?.engine_bridge?.missing_blocks || [],
        gate_scenario: pilotBinding === 0 ? 'A_NO_DATASET' : 'B_BELOW_THRESHOLD',
        gf: 'GF-018'
      })
    };
  }

  if (eligibility.shadow_only && !ctx.force_ishikawa_consolidation) {
    const preview = await consolidateIshikawaCockpit(user, payload, ctx, ishikawaPilot);
    return {
      payload,
      ok: true,
      shadow_compare_only: true,
      ishikawa_cockpit_preview: preview,
      ishikawa_cognitive_runtime: buildIshikawaRuntimeDescriptor({
        consolidation_applied: false,
        preview_only: true,
        inactive: true,
        binding_ratio: eligibility.binding_ratio
      })
    };
  }

  const consolidated = await consolidateIshikawaCockpit(user, payload, ctx, ishikawaPilot);
  const enriched = { ...payload };

  enriched.ishikawa_cognitive_centers = consolidated.centers || [];
  enriched.widgets_promoted = consolidated.widgets?.length ? consolidated.widgets : enriched.widgets_promoted;
  enriched.cockpit_operational_metrics = enriched.cockpit_operational_metrics || {
    ishikawa_native: true,
    centers: consolidated.centers?.length ?? 0,
    binding_ratio: consolidated.ishikawa_cognitive_health?.binding_ratio ?? 0
  };

  const promotionApplied = payload.cognitive_render_promotion?.promotion_applied === true;

  const ishikawa_cognitive_runtime = buildIshikawaRuntimeDescriptor({
    consolidation_applied: true,
    promotion_applied: promotionApplied,
    inactive: false,
    cockpit_mode: 'ishikawa_native',
    centers_count: (consolidated.centers || []).length,
    centers: consolidated.centers,
    bound_blocks: ishikawaPilot?.engine_bridge?.bound_blocks || [],
    missing_blocks: ishikawaPilot?.engine_bridge?.missing_blocks || [],
    binding_ratio: consolidated.ishikawa_cognitive_health?.binding_ratio ?? 0,
    foundation_status: 'promotion_active',
    ishikawa_cognitive_health: consolidated.ishikawa_cognitive_health,
    runtime_name: 'ishikawa_native',
    runtime_id: 'ishikawa_native',
    gate_scenario: 'C_GATE_PASS',
    gf: 'GF-018'
  });

  enriched.ishikawa_cognitive_runtime = ishikawa_cognitive_runtime;
  enriched.ishikawa_runtime = ishikawa_cognitive_runtime;

  logIshikawaPromotion('Z23_APPLIED', {
    binding_ratio: ishikawa_cognitive_runtime.binding_ratio,
    centers_count: ishikawa_cognitive_runtime.centers_count,
    promotion_applied: promotionApplied,
    gate_scenario: 'C_GATE_PASS'
  });

  return {
    payload: enriched,
    ok: true,
    ishikawa_cognitive_runtime,
    ishikawa_cockpit_consolidated: consolidated
  };
}

module.exports = { applyIshikawaCockpitConsolidation };
