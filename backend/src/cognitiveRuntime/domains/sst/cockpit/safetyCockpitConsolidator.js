'use strict';

const { loadSafetyTenantSignals } = require('../bridge/safetySignalLoader');
const { invokeSafetyBlockBridge, buildSafetyEngineContext } = require('../bridge/safetyEngineBridge');
const { SST_PILOT_BLOCK_IDS } = require('../../../registry/sstCognitiveBlockPack');
const { buildIncidentIntelligenceCenter } = require('./incidentIntelligenceCenter');
const { buildPermitGovernanceCenter } = require('./permitGovernanceCenter');
const { buildPpeComplianceCenter } = require('./ppeComplianceCenter');
const { buildHazardHeatmapCenter } = require('./hazardHeatmapCenter');
const { buildFieldOccurrenceCenter } = require('./fieldOccurrenceCenter');
const { buildRiskMatrixCenter } = require('./riskMatrixCenter');
const { buildSafetyTelemetryCenter } = require('./safetyTelemetryCenter');
const { buildSafetyNarrativeCenter } = require('./safetyNarrativeCenter');
const { buildSafetyDecisionSupport } = require('./safetyDecisionSupport');
const { balanceSafetyCenters } = require('../runtime/safetyWeightBalancer');
const { applySafetyDensityGovernor } = require('../runtime/safetyDensityGovernor');
const { superviseSafetyFallback } = require('../runtime/safetyFallbackSupervisor');
const { validateSafetySemanticPayload } = require('../runtime/safetySemanticValidator');
const { computeSafetyCognitiveHealth } = require('../observability/safetyCognitiveHealth');
const { buildSafetyOperationalMetrics } = require('../observability/safetyOperationalMetrics');
const { buildSafetySuppressionPlan } = require('../../../renderPromotion/safety/safetyWidgetSuppression');
const { resolvePromotedSafetyWidgetsFromShadow } = require('../../../renderPromotion/safety/safetyWidgetPromotionResolver');
const { optimizeCockpitUsefulness } = require('../../../cockpitConsolidation/runtime/cockpitUsefulnessOptimizer');
const { SAFETY_GENERIC_WIDGET_IDS } = require('../../../renderPromotion/safety/safetyWidgetSuppression');

async function loadSafetyConsolidationBundle(user, payload, ctx, safetyPilot) {
  const signalBundle = await loadSafetyTenantSignals(user, { ...ctx, mock_signals: ctx.mock_signals });
  const bindings = [];
  for (const blockId of SST_PILOT_BLOCK_IDS) {
    bindings.push(invokeSafetyBlockBridge(blockId, signalBundle, { tenant_id: user?.company_id }));
  }
  const engineContext = buildSafetyEngineContext(signalBundle, bindings);
  return { signalBundle, bindings, engineContext, binding_ratio: safetyPilot?.engine_bridge?.binding_ratio ?? 0.7 };
}

function collapseGenericSafetyWidgets(widgets = []) {
  const genericSet = new Set(SAFETY_GENERIC_WIDGET_IDS);
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

async function consolidateSafetyCockpit(user = {}, payload = {}, ctx = {}, safetyPilot = {}) {
  const shadow = safetyPilot.shadow_cognitive_cockpit || {};
  const { signalBundle, bindings, engineContext, binding_ratio } = await loadSafetyConsolidationBundle(
    user,
    payload,
    ctx,
    safetyPilot
  );

  const centersRaw = [
    buildIncidentIntelligenceCenter(bindings, signalBundle),
    buildPermitGovernanceCenter(bindings),
    buildPpeComplianceCenter(bindings, signalBundle),
    buildHazardHeatmapCenter(bindings, signalBundle),
    buildFieldOccurrenceCenter(bindings),
    buildRiskMatrixCenter(bindings),
    buildSafetyTelemetryCenter(bindings),
    buildSafetyNarrativeCenter(bindings, engineContext),
    buildSafetyDecisionSupport(bindings, engineContext)
  ];

  const balanced = balanceSafetyCenters(centersRaw, payload.profile_code);

  let widgets =
    payload.widgets_promoted?.length > 0
      ? payload.widgets_promoted
      : resolvePromotedSafetyWidgetsFromShadow(shadow, { max_widgets: 8 });
  widgets = collapseGenericSafetyWidgets(widgets);

  const suppression = buildSafetySuppressionPlan(
    payload.widgets_legacy || payload.profile_config?.widgets || [],
    { max_suppressed: 6 }
  );

  const densityOut = applySafetyDensityGovernor(balanced, widgets.filter((w) => !w.collapsed_generic));
  const usefulness = optimizeCockpitUsefulness(densityOut.centers, binding_ratio);

  let consolidated = {
    centers: densityOut.centers,
    widgets: densityOut.widgets,
    suppression,
    density: densityOut.density,
    usefulness,
    decision_support: centersRaw.find((c) => c.center_id === 'safety_decision_support'),
    operational_metrics: buildSafetyOperationalMetrics(densityOut.centers, densityOut.widgets)
  };

  consolidated = superviseSafetyFallback(consolidated, payload);

  const promotedCount = consolidated.widgets.filter((w) => w.render_promoted !== false && !w.collapsed_generic).length;
  const totalW = Math.max(consolidated.widgets.length, 1);
  const specializedRatio = Math.round((promotedCount / totalW) * 1000) / 1000;
  const genericRatio = Math.round((suppression.generic_suppressed_count / Math.max(totalW + suppression.generic_suppressed_count, 1)) * 1000) / 1000;
  const operationalFocus = computeOperationalFocus(consolidated.centers);
  const semantic = validateSafetySemanticPayload(payload, consolidated.centers);

  const { safety_cognitive_health } = computeSafetyCognitiveHealth({
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
    safety_cognitive_health,
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

module.exports = { consolidateSafetyCockpit, loadSafetyConsolidationBundle };
