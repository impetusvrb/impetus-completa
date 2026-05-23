'use strict';

const { loadHrTenantSignals } = require('../bridge/hrTenantSignalLoader');
const { invokeHrBlockBridge, buildHrEngineContext } = require('../bridge/hrEngineBridge');
const { HR_PILOT_BLOCK_IDS } = require('../../../registry/hrCognitiveBlockPack');
const {
  buildPeopleAnalyticsCenter,
  buildTurnoverHeatmapCenter,
  buildAbsenteeismCenter,
  buildTrainingGovernanceCenter,
  buildPerformanceCenter,
  buildRecruitmentCenter,
  buildRetentionCenter,
  buildBehavioralCenter,
  buildWorkforceHealthCenter,
  buildHrNarrativeCenter,
  buildHrDecisionSupport
} = require('./hrCenters');
const { balanceHrCenters } = require('../runtime/hrWeightBalancer');
const { applyHrDensityGovernor } = require('../runtime/hrDensityGovernor');
const { superviseHrFallback } = require('../runtime/hrFallbackSupervisor');
const { validateHrSemanticPayload } = require('../runtime/hrSemanticValidator');
const { computeHrCognitiveHealth } = require('../observability/hrCognitiveHealth');
const { buildHrOperationalMetrics } = require('../observability/hrOperationalMetrics');
const { buildHrSuppressionPlan } = require('../../../renderPromotion/hr/hrWidgetSuppression');
const { resolvePromotedHrWidgetsFromShadow } = require('../../../renderPromotion/hr/hrWidgetPromotionResolver');
const { optimizeCockpitUsefulness } = require('../../../cockpitConsolidation/runtime/cockpitUsefulnessOptimizer');
const { HR_GENERIC_WIDGET_IDS } = require('../../../renderPromotion/hr/hrWidgetSuppression');

async function loadHrConsolidationBundle(user, payload, ctx, hrPilot) {
  const signalBundle = await loadHrTenantSignals(user, { ...ctx, mock_signals: ctx.mock_signals });
  const bindings = HR_PILOT_BLOCK_IDS.map((id) => invokeHrBlockBridge(id, signalBundle, { tenant_id: user?.company_id }));
  const engineContext = buildHrEngineContext(signalBundle, bindings);
  return {
    signalBundle,
    bindings,
    engineContext,
    binding_ratio: hrPilot?.engine_bridge?.binding_ratio ?? 0.7
  };
}

function collapseGenericHrWidgets(widgets = []) {
  const genericSet = new Set(HR_GENERIC_WIDGET_IDS);
  return widgets.map((w) => {
    const id = String(w.id || w.widget_id || '');
    if (genericSet.has(id)) {
      return { ...w, collapsed_generic: true, render_weight: 0.1, visible: false };
    }
    return w;
  });
}

function computeOperationalFocus(centers = []) {
  const op = centers.filter((c) => c.layer === 'operational').reduce((s, c) => s + (c.weight || 0), 0);
  const total = centers.reduce((s, c) => s + (c.weight || 0), 0) || 1;
  return Math.round((op / total) * 1000) / 1000;
}

async function consolidateHrCockpit(user = {}, payload = {}, ctx = {}, hrPilot = {}) {
  const shadow = hrPilot.shadow_cognitive_cockpit || {};
  const { signalBundle, bindings, engineContext, binding_ratio } = await loadHrConsolidationBundle(
    user,
    payload,
    ctx,
    hrPilot
  );

  const centersRaw = [
    buildPeopleAnalyticsCenter(bindings, signalBundle),
    buildTurnoverHeatmapCenter(bindings, signalBundle),
    buildAbsenteeismCenter(bindings, signalBundle),
    buildRetentionCenter(bindings, signalBundle),
    buildWorkforceHealthCenter(bindings, signalBundle),
    buildTrainingGovernanceCenter(bindings),
    buildPerformanceCenter(bindings),
    buildRecruitmentCenter(bindings),
    buildBehavioralCenter(bindings),
    buildHrNarrativeCenter(bindings, engineContext),
    buildHrDecisionSupport(bindings, engineContext)
  ];

  const balanced = balanceHrCenters(centersRaw, payload.profile_code);

  let widgets =
    payload.widgets_promoted?.length > 0
      ? payload.widgets_promoted
      : resolvePromotedHrWidgetsFromShadow(shadow, { max_widgets: 8 });
  widgets = collapseGenericHrWidgets(widgets);

  const suppression = buildHrSuppressionPlan(payload.widgets_legacy || payload.profile_config?.widgets || [], {
    max_suppressed: 6
  });

  const densityOut = applyHrDensityGovernor(balanced, widgets.filter((w) => !w.collapsed_generic));
  const usefulness = optimizeCockpitUsefulness(densityOut.centers, binding_ratio);

  let consolidated = {
    centers: densityOut.centers,
    widgets: densityOut.widgets,
    suppression,
    density: densityOut.density,
    usefulness,
    decision_support: centersRaw.find((c) => c.center_id === 'hr_decision_support'),
    operational_metrics: buildHrOperationalMetrics(densityOut.centers, densityOut.widgets)
  };

  consolidated = superviseHrFallback(consolidated, payload);

  const promotedCount = consolidated.widgets.filter((w) => w.render_promoted !== false && !w.collapsed_generic).length;
  const totalW = Math.max(consolidated.widgets.length, 1);
  const specializedRatio = Math.round((promotedCount / totalW) * 1000) / 1000;
  const genericRatio = Math.round((suppression.generic_suppressed_count / Math.max(totalW + suppression.generic_suppressed_count, 1)) * 1000) / 1000;
  const operationalFocus = computeOperationalFocus(consolidated.centers);
  const semantic = validateHrSemanticPayload(payload, consolidated.centers);

  const { hr_cognitive_health } = computeHrCognitiveHealth({
    specialized_ratio: specializedRatio,
    generic_ratio: genericRatio,
    operational_focus: operationalFocus,
    usefulness: usefulness.usefulness,
    density: consolidated.density,
    semantic_fidelity: semantic.semantic_fidelity
  });

  return {
    ok: true,
    centers: consolidated.centers,
    widgets: consolidated.widgets,
    widgets_legacy: payload.widgets_legacy || suppression.active_legacy,
    suppression,
    density: consolidated.density,
    usefulness,
    hr_cognitive_health,
    specialized_ratio: specializedRatio,
    generic_ratio: genericRatio,
    operational_focus: operationalFocus,
    semantic_validation: semantic,
    decision_support: consolidated.decision_support,
    operational_metrics: consolidated.operational_metrics,
    fallback: consolidated.fallback,
    engineContext
  };
}

module.exports = { consolidateHrCockpit, loadHrConsolidationBundle };
