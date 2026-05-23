'use strict';

const flags = require('../../../config/phaseZ27FeatureFlags');
const { isExecutiveProfile } = require('../../../renderPromotion/executive/executiveControlledRenderRuntime');
const { consolidateExecutiveBoardroom } = require('../cockpit/executiveCockpitConsolidator');
const { emitExecutiveBoardroomTelemetry } = require('../observability/executiveBoardroomTelemetry');

async function applyExecutiveBoardroomConsolidation(user = {}, payload = {}, ctx = {}, execPilot = {}) {
  if (!flags.isExecutiveBoardroomPilot() && !ctx.force_executive_consolidation) {
    return { payload, skipped: true, reason: 'executive_boardroom_off' };
  }
  if (!isExecutiveProfile(payload, ctx)) return { payload, skipped: true, reason: 'not_executive_domain' };
  if (execPilot?.pilot_skipped) return { payload, skipped: true, reason: execPilot.reason };
  if (
    payload.cognitive_render_promotion?.promotion_applied !== true &&
    ctx.z27_render_promoted !== true &&
    ctx.force_executive_consolidation !== true
  ) {
    return { payload, skipped: true, reason: 'z27_render_promotion_required' };
  }

  if (flags.isExecutiveCognitiveRuntimeShadow() && !flags.isExecutiveBoardroomPilot() && !ctx.force_executive_consolidation) {
    const preview = await consolidateExecutiveBoardroom(user, payload, ctx, execPilot);
    return { payload, ok: true, shadow_compare_only: true, executive_boardroom_preview: preview };
  }

  const consolidated = await consolidateExecutiveBoardroom(user, payload, ctx, execPilot);
  const enriched = { ...payload };
  enriched.executive_cognitive_centers = consolidated.centers;
  enriched.executive_decision_support = consolidated.executive_contextual_ai;
  enriched.widgets_promoted = consolidated.widgets;
  enriched.specialized_summary = consolidated.specialized_summary;

  const executive_cognitive_runtime = {
    phase: 'Z.27',
    cockpit_mode: 'executive_boardroom',
    consolidation_applied: true,
    global_replace: false,
    centers: consolidated.centers,
    executive_cognitive_health: consolidated.executive_cognitive_health,
    density: consolidated.density,
    aggregation_readiness: consolidated.aggregation_readiness,
    strategic: consolidated.strategic,
    convergence_validation: consolidated.convergence_validation
  };
  enriched.executive_cognitive_runtime = executive_cognitive_runtime;

  if (flags.isExecutiveLiveValidationEnabled()) {
    try {
      const lv = require('../liveValidation/executiveLiveValidationFacade');
      const report = await lv.runExecutiveLiveValidation(user, enriched, ctx, { consolidated });
      if (!report.skipped) {
        enriched.executive_live_validation = report.executive_live_validation;
      }
    } catch (_) {}
  }

  emitExecutiveBoardroomTelemetry('EXECUTIVE_BOARDROOM_CONSOLIDATED', {
    tenant_id: user?.company_id,
    centers: consolidated.centers.length
  });
  return { payload: enriched, ok: true, executive_cognitive_runtime };
}

module.exports = { applyExecutiveBoardroomConsolidation };
