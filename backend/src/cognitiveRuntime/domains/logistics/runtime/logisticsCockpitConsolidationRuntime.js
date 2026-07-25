'use strict';

const flags = require('../../../config/phaseLogisticsNativeFeatureFlags');
const { isLogisticsProfile } = require('../runtime/logisticsRuntimeDescriptor');
const { consolidateLogisticsCockpit } = require('../cockpit/logisticsCockpitConsolidator');
const { buildLogisticsRuntimeDescriptor } = require('../runtime/logisticsRuntimeDescriptor');
const { evaluateLogisticsConsolidationEligibility } = require('../cockpit/logisticsConsolidationSupervisor');

/**
 * INC-041 — Z.23 runtime gate logistics_native (consumidor passivo Z.22).
 */
async function applyLogisticsCockpitConsolidation(user = {}, payload = {}, ctx = {}, logisticsPilot = {}) {
  const eligibility = evaluateLogisticsConsolidationEligibility(payload, ctx, logisticsPilot);

  if (!eligibility.allowed) {
    return {
      payload,
      ok: false,
      skipped: true,
      reason: eligibility.reason,
      logistics_cognitive_runtime: buildLogisticsRuntimeDescriptor({
        consolidation_applied: false,
        promotion_applied: payload.cognitive_render_promotion?.promotion_applied === true,
        inactive: true,
        reason: eligibility.reason,
        binding_ratio: logisticsPilot?.engine_bridge?.binding_ratio ?? 0
      })
    };
  }

  if (eligibility.shadow_only && !ctx.force_logistics_consolidation) {
    const preview = await consolidateLogisticsCockpit(user, payload, ctx, logisticsPilot);
    return {
      payload,
      ok: true,
      shadow_compare_only: true,
      logistics_cockpit_preview: preview,
      logistics_cognitive_runtime: buildLogisticsRuntimeDescriptor({
        consolidation_applied: false,
        preview_only: true,
        inactive: true,
        binding_ratio: eligibility.binding_ratio
      })
    };
  }

  const consolidated = await consolidateLogisticsCockpit(user, payload, ctx, logisticsPilot);
  const enriched = { ...payload };

  enriched.logistics_cognitive_centers = consolidated.centers || [];
  enriched.widgets_promoted = consolidated.widgets;
  enriched.cockpit_operational_metrics = enriched.cockpit_operational_metrics || {
    logistics_native: true,
    centers: consolidated.centers?.length ?? 0,
    binding_ratio: consolidated.logistics_cognitive_health?.binding_ratio ?? 0
  };

  const promotionApplied = payload.cognitive_render_promotion?.promotion_applied === true;

  const logistics_cognitive_runtime = buildLogisticsRuntimeDescriptor({
    consolidation_applied: true,
    promotion_applied: promotionApplied,
    inactive: false,
    centers_count: (consolidated.centers || []).length,
    centers: consolidated.centers,
    binding_ratio: consolidated.logistics_cognitive_health?.binding_ratio ?? 0,
    foundation_status: 'promotion_active',
    logistics_cognitive_health: consolidated.logistics_cognitive_health,
    runtime_name: 'logistics_native',
    runtime_id: 'logistics_native',
    inc: 'INC-041'
  });

  enriched.logistics_cognitive_runtime = logistics_cognitive_runtime;
  enriched.logistics_runtime = logistics_cognitive_runtime;

  return {
    payload: enriched,
    ok: true,
    logistics_cognitive_runtime,
    logistics_cockpit_consolidated: consolidated
  };
}

module.exports = { applyLogisticsCockpitConsolidation };
