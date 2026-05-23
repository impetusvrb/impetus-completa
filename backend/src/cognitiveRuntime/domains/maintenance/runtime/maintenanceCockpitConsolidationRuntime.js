'use strict';

const flags = require('../../../config/phaseZM1FeatureFlags');
const { isMaintenanceProfile, applyMaintenanceControlledRenderPromotion } = require('../../../renderPromotion/maintenance/maintenanceControlledRenderRuntime');
const { consolidateMaintenanceCockpit } = require('../cockpit/maintenanceCockpitConsolidator');
const { emitMaintenanceCockpitTelemetry } = require('../observability/maintenanceCockpitTelemetry');

async function applyMaintenanceCockpitConsolidation(user = {}, payload = {}, ctx = {}, maintPilot = {}) {
  if (!flags.isMaintenanceNativeCockpitPilot() && !ctx.force_maintenance_consolidation) {
    return { payload, skipped: true, reason: 'maintenance_native_cockpit_off' };
  }
  if (!isMaintenanceProfile(payload, ctx)) return { payload, skipped: true, reason: 'not_maintenance_domain' };
  if (maintPilot?.pilot_skipped) return { payload, skipped: true, reason: maintPilot.reason };
  if (
    payload.cognitive_render_promotion?.promotion_applied !== true &&
    ctx.zm1_render_promoted !== true &&
    ctx.force_maintenance_consolidation !== true
  ) {
    return { payload, skipped: true, reason: 'zm1_render_promotion_required' };
  }

  if (flags.isMaintenanceCognitiveRuntimeShadow() && !flags.isMaintenanceNativeCockpitPilot() && !ctx.force_maintenance_consolidation) {
    const preview = await consolidateMaintenanceCockpit(user, payload, ctx, maintPilot);
    return { payload, ok: true, shadow_compare_only: true, maintenance_cockpit_preview: preview };
  }

  const consolidated = await consolidateMaintenanceCockpit(user, payload, ctx, maintPilot);
  const enriched = { ...payload };
  enriched.maintenance_cognitive_centers = consolidated.centers;
  enriched.maintenance_decision_support = consolidated.decision_support;
  enriched.maintenance_contextual_questions = consolidated.maintenance_contextual_questions;
  enriched.widgets_promoted = consolidated.widgets;
  enriched.specialized_summary = consolidated.specialized_summary;

  const maintenance_cognitive_runtime = {
    phase: 'Z.M1',
    cockpit_mode: 'maintenance_native',
    consolidation_applied: true,
    global_replace: false,
    auto_maintenance: false,
    auto_action: false,
    centers: consolidated.centers,
    maintenance_cognitive_health: consolidated.maintenance_cognitive_health,
    density: consolidated.density,
    telemetry_readiness: consolidated.telemetry_readiness,
    semantic_validation: consolidated.semantic_validation,
    predictive_governance: consolidated.predictive_governance
  };
  enriched.maintenance_cognitive_runtime = maintenance_cognitive_runtime;

  if (flags.isMaintenanceLiveValidationEnabled()) {
    try {
      const lv = require('../liveValidation/maintenanceLiveValidationFacade');
      const report = await lv.runMaintenanceLiveValidation(user, enriched, ctx, { consolidated });
      if (!report.skipped) enriched.maintenance_live_validation = report.maintenance_live_validation;
    } catch (_) {}
  }

  emitMaintenanceCockpitTelemetry('MAINTENANCE_COCKPIT_CONSOLIDATED', {
    tenant_id: user?.company_id,
    centers: consolidated.centers.length
  });
  return { payload: enriched, ok: true, maintenance_cognitive_runtime };
}

module.exports = { applyMaintenanceCockpitConsolidation };
