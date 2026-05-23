'use strict';

const { buildSpecializedDeliveryArtifacts } = require('../../domainAdapters/runtime/specializedDeliveryAdapter');
const { buildQualityOperationalCenter } = require('./qualityOperationalCenter');
const { buildQualityActionCenter } = require('./qualityActionCenter');
const { buildQualityTelemetryCenter } = require('./qualityTelemetryCenter');
const { buildQualityGovernanceCenter } = require('./qualityGovernanceCenter');
const { buildQualityNarrativeCenter } = require('./qualityNarrativeCenter');
const { buildQualityDecisionSupport } = require('./qualityDecisionSupport');
const { balanceCentersByDomain, computeOperationalFocus } = require('../runtime/cockpitDomainBalancer');
const { applyDensityGovernor } = require('../runtime/cockpitDensityGovernor');
const { optimizeCockpitUsefulness } = require('../runtime/cockpitUsefulnessOptimizer');
const { superviseCockpitFallback } = require('../runtime/cockpitFallbackSupervisor');
const { GENERIC_WIDGET_IDS, buildSuppressionPlan } = require('../../renderPromotion/quality/qualityWidgetSuppression');
const { resolvePromotedWidgetsFromShadow } = require('../../renderPromotion/quality/qualityWidgetPromotionResolver');
const { enrichSummaryPayload } = require('../../domainAdapters/quality/qualitySummaryAdapter');
const { computeCockpitCognitiveHealth } = require('../observability/cockpitCognitiveHealth');
const { buildCockpitOperationalMetrics } = require('../observability/cockpitOperationalMetrics');

async function loadQualityConsolidationBundle(user, payload, ctx, qualityPilot) {
  const { artifacts, bundle } = await buildSpecializedDeliveryArtifacts(user, payload, ctx, qualityPilot);
  return { artifacts, bundle, signalBundle: bundle.signalBundle, bindings: bundle.bindings, engineContext: bundle.engineContext };
}

function collapseGenericWidgets(widgets = []) {
  const genericSet = new Set(GENERIC_WIDGET_IDS);
  return widgets.map((w) => {
    const id = String(w.id || w.widget_id || '');
    if (genericSet.has(id)) {
      return { ...w, collapsed_generic: true, render_weight: 0.1, visible: false };
    }
    return w;
  });
}

async function consolidateQualityCockpit(user = {}, payload = {}, ctx = {}, qualityPilot = {}) {
  const shadow = qualityPilot.shadow_cognitive_cockpit || {};
  const { artifacts, bundle, bindings, engineContext, signalBundle } = await loadQualityConsolidationBundle(
    user,
    payload,
    ctx,
    qualityPilot
  );

  const centersRaw = [
    buildQualityOperationalCenter(bindings, signalBundle),
    buildQualityActionCenter(bindings),
    buildQualityTelemetryCenter(bindings),
    buildQualityGovernanceCenter(bindings, signalBundle),
    buildQualityNarrativeCenter(bindings, engineContext),
    buildQualityDecisionSupport(bindings, engineContext)
  ];

  const balanced = balanceCentersByDomain(centersRaw, payload.profile_code);
  const bindingRatio = qualityPilot?.engine_bridge?.binding_ratio ?? 0;

  let widgets =
    payload.widgets_promoted?.length > 0
      ? payload.widgets_promoted
      : resolvePromotedWidgetsFromShadow(shadow, { max_widgets: 8 });

  widgets = collapseGenericWidgets(widgets);
  const suppression = buildSuppressionPlan(
    payload.widgets_legacy || payload.profile_config?.widgets || [],
    { max_suppressed: 6 }
  );

  const densityOut = applyDensityGovernor(balanced, widgets.filter((w) => !w.collapsed_generic));
  const usefulness = optimizeCockpitUsefulness(densityOut.centers, bindingRatio);

  let consolidated = {
    centers: densityOut.centers,
    widgets: densityOut.widgets,
    suppression,
    density: densityOut.density,
    usefulness,
    decision_support: centersRaw.find((c) => c.center_id === 'quality_decision_support') || buildQualityDecisionSupport(bindings, engineContext),
    operational_metrics: buildCockpitOperationalMetrics(densityOut.centers, densityOut.widgets)
  };

  consolidated = superviseCockpitFallback(consolidated, payload);

  const promotedCount = consolidated.widgets.filter((w) => w.render_promoted !== false).length;
  const totalW = Math.max(consolidated.widgets.length, 1);
  const specializedRatio = Math.round((promotedCount / totalW) * 1000) / 1000;
  const genericRatio = Math.round((suppression.generic_suppressed_count / Math.max(totalW + suppression.generic_suppressed_count, 1)) * 1000) / 1000;
  const operationalFocus = computeOperationalFocus(consolidated.centers);

  const cognitiveHealth = computeCockpitCognitiveHealth({
    specialized_ratio: specializedRatio,
    generic_ratio: genericRatio,
    operational_focus: operationalFocus,
    usefulness: usefulness.usefulness,
    density: consolidated.density
  });

  let summaryPatch = null;
  if (artifacts.summary?.ok) {
    const sumOut = enrichSummaryPayload(
      { summary: payload.summary, text: payload.text },
      artifacts.summary
    );
    if (sumOut.enriched) summaryPatch = sumOut.payload;
  }

  return {
    ok: true,
    centers: consolidated.centers,
    widgets: consolidated.widgets,
    widgets_legacy: payload.widgets_legacy || suppression.active_legacy,
    suppression,
    density: consolidated.density,
    usefulness,
    cognitive_health: cognitiveHealth,
    specialized_ratio: specializedRatio,
    generic_ratio: genericRatio,
    operational_focus: operationalFocus,
    summary_patch: summaryPatch,
    decision_support: consolidated.decision_support,
    operational_metrics: consolidated.operational_metrics,
    fallback: {
      used: consolidated.fallback_used,
      reason: consolidated.fallback_reason,
      preserved: consolidated.fallback_preserved !== false
    },
    binding_ratio: bindingRatio
  };
}

module.exports = { consolidateQualityCockpit, loadQualityConsolidationBundle };
