'use strict';

const { loadProductionTenantSignals } = require('../bridge/productionSignalLoader');
const { invokeProductionBlockBridge, buildProductionEngineContext } = require('../bridge/productionEngineBridge');
const { PRODUCTION_PILOT_BLOCK_IDS } = require('../../../registry/productionCognitiveBlockPack');
const {
  buildOeeCenter,
  buildThroughputCenter,
  buildBottleneckCenter,
  buildDowntimeCenter,
  buildTelemetryCenter,
  buildScrapCenter,
  buildOperationalAiCenter,
  buildProductionNarrativeCenter,
  buildProductionDecisionSupport
} = require('./productionCenters');
const { balanceProductionCenters } = require('../runtime/productionWeightBalancer');
const { applyProductionDensityGovernor } = require('../runtime/productionDensityGovernor');
const { balanceTelemetryLoad } = require('../runtime/telemetryLoadBalancer');
const { superviseProductionFallback } = require('../runtime/productionFallbackSupervisor');
const { validateProductionSemanticPayload } = require('../runtime/productionSemanticValidator');
const { computeProductionCognitiveHealth } = require('../observability/productionCognitiveHealth');
const { buildProductionOperationalMetrics } = require('../observability/productionOperationalMetrics');
const { buildProductionSuppressionPlan } = require('../../../renderPromotion/production/productionWidgetSuppression');
const { resolvePromotedProductionWidgetsFromShadow } = require('../../../renderPromotion/production/productionWidgetPromotionResolver');
const { optimizeCockpitUsefulness } = require('../../../cockpitConsolidation/runtime/cockpitUsefulnessOptimizer');
const { PRODUCTION_GENERIC_WIDGET_IDS } = require('../../../renderPromotion/production/productionWidgetSuppression');
const { protectCockpitOverload } = require('../runtime/cockpitOverloadProtection');

async function loadProductionConsolidationBundle(user, payload, ctx, productionPilot) {
  const signalBundle = await loadProductionTenantSignals(user, { ...ctx, mock_signals: ctx.mock_signals });
  const bindings = PRODUCTION_PILOT_BLOCK_IDS.map((id) =>
    invokeProductionBlockBridge(id, signalBundle, { tenant_id: user?.company_id })
  );
  const engineContext = buildProductionEngineContext(signalBundle, bindings);
  return {
    signalBundle,
    bindings,
    engineContext,
    binding_ratio: productionPilot?.engine_bridge?.binding_ratio ?? 0.75
  };
}

function collapseGenericProductionWidgets(widgets = []) {
  const genericSet = new Set(PRODUCTION_GENERIC_WIDGET_IDS);
  return widgets.map((w) => {
    const id = String(w.id || w.widget_id || '');
    if (genericSet.has(id)) {
      return { ...w, collapsed_generic: true, render_weight: 0.1, visible: false };
    }
    return w;
  });
}

async function consolidateProductionCockpit(user = {}, payload = {}, ctx = {}, productionPilot = {}) {
  const shadow = productionPilot.shadow_cognitive_cockpit || {};
  const { signalBundle, bindings, engineContext, binding_ratio } = await loadProductionConsolidationBundle(
    user,
    payload,
    ctx,
    productionPilot
  );

  let centersRaw = [
    buildOeeCenter(bindings, signalBundle),
    buildThroughputCenter(bindings, signalBundle),
    buildBottleneckCenter(bindings, signalBundle),
    buildDowntimeCenter(bindings, signalBundle),
    buildScrapCenter(bindings),
    buildTelemetryCenter(bindings),
    buildOperationalAiCenter(bindings, engineContext),
    buildProductionNarrativeCenter(bindings, engineContext),
    buildProductionDecisionSupport(bindings, engineContext)
  ];

  centersRaw = balanceTelemetryLoad(balanceProductionCenters(centersRaw, payload.profile_code));

  let widgets =
    payload.widgets_promoted?.length > 0
      ? payload.widgets_promoted
      : resolvePromotedProductionWidgetsFromShadow(shadow, { max_widgets: 8 });
  widgets = collapseGenericProductionWidgets(widgets);

  const suppression = buildProductionSuppressionPlan(payload.widgets_legacy || payload.profile_config?.widgets || [], {
    max_suppressed: 8
  });

  const densityOut = applyProductionDensityGovernor(centersRaw, widgets.filter((w) => !w.collapsed_generic));
  const usefulness = optimizeCockpitUsefulness(densityOut.centers, binding_ratio);
  const overload = protectCockpitOverload({ centers: densityOut.centers, widgets: densityOut.widgets });

  let consolidated = {
    centers: densityOut.centers,
    widgets: densityOut.widgets,
    suppression,
    density: densityOut.density,
    usefulness,
    overload,
    decision_support: centersRaw.find((c) => c.center_id === 'production_decision_support'),
    operational_metrics: buildProductionOperationalMetrics(densityOut.centers, densityOut.widgets),
    production_contextual_ai: engineContext.ai,
    production_narrative: engineContext.narrative,
    telemetry_readiness: signalBundle.telemetry_readiness
  };

  consolidated = superviseProductionFallback(consolidated, payload);

  const semantic = validateProductionSemanticPayload(payload, consolidated.centers);
  const promotedCount = consolidated.widgets.filter((w) => w.render_promoted !== false && !w.collapsed_generic).length;
  const totalW = Math.max(consolidated.widgets.length, 1);
  const specializedRatio = Math.round((promotedCount / totalW) * 1000) / 1000;
  const opFocus =
    consolidated.centers.filter((c) => c.layer === 'operational').reduce((s, c) => s + (c.weight || 0), 0) /
    Math.max(consolidated.centers.reduce((s, c) => s + (c.weight || 0), 0), 1);

  const { production_cognitive_health } = computeProductionCognitiveHealth({
    specialized_ratio: specializedRatio,
    operational_focus: opFocus,
    usefulness: usefulness.usefulness,
    telemetry_ready: signalBundle.telemetry_readiness === 'ready',
    overload_detected: overload.overload_detected
  });

  return {
    phase: 'Z.P0',
    cockpit_mode: 'production_native',
    consolidation_applied: true,
    global_replace: false,
    centers: consolidated.centers,
    widgets: consolidated.widgets,
    widgets_legacy: payload.widgets_legacy,
    suppression: consolidated.suppression,
    density: consolidated.density,
    usefulness: consolidated.usefulness,
    decision_support: consolidated.decision_support,
    operational_metrics: consolidated.operational_metrics,
    production_cognitive_health,
    semantic_validation: semantic,
    production_contextual_questions: engineContext.ai?.contextual_questions,
    specialized_summary: engineContext.narrative?.paragraphs?.join(' ') || null,
    telemetry_readiness: signalBundle.telemetry_readiness
  };
}

module.exports = { consolidateProductionCockpit, loadProductionConsolidationBundle };
