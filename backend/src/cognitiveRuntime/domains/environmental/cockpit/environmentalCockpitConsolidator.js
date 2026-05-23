'use strict';

const { loadEnvironmentalTenantSignals } = require('../bridge/environmentalSignalLoader');
const { invokeEnvironmentalBlockBridge, buildEnvironmentalEngineContext } = require('../bridge/environmentalEngineBridge');
const { ENVIRONMENTAL_PILOT_BLOCK_IDS } = require('../../../registry/environmentalCognitiveBlockPack');
const {
  buildEmissionsCenter,
  buildEsgCenter,
  buildComplianceCenter,
  buildWasteCenter,
  buildRiskCenter,
  buildTelemetryCenter,
  buildTimelineCenter,
  buildEnvironmentalAiCenter,
  buildEnvironmentalNarrativeCenter,
  buildEnvironmentalDecisionSupport
} = require('./environmentalCenters');
const { balanceEnvironmentalCenters } = require('../runtime/environmentalWeightBalancer');
const { applyEnvironmentalDensityGovernor } = require('../runtime/environmentalDensityGovernor');
const { resolveRegulatoryPriority } = require('../runtime/regulatoryPriorityResolver');
const { balanceAuditPressure } = require('../runtime/auditPressureBalancer');
const { superviseEnvironmentalFallback } = require('../runtime/environmentalFallbackSupervisor');
const { validateEnvironmentalSemanticPayload } = require('../runtime/environmentalSemanticValidator');
const { computeEnvironmentalCognitiveHealth } = require('../observability/environmentalCognitiveHealth');
const { buildEnvironmentalSuppressionPlan, ENVIRONMENTAL_GENERIC_WIDGET_IDS } = require('../../../renderPromotion/environmental/environmentalWidgetSuppression');
const { resolvePromotedEnvironmentalWidgetsFromShadow } = require('../../../renderPromotion/environmental/environmentalWidgetPromotionResolver');
const { optimizeCockpitUsefulness } = require('../../../cockpitConsolidation/runtime/cockpitUsefulnessOptimizer');
const flags = require('../../../config/phaseP1EnvironmentalFeatureFlags');

async function consolidateEnvironmentalCockpit(user = {}, payload = {}, ctx = {}, envPilot = {}) {
  const shadow = envPilot.shadow_cognitive_cockpit || {};
  const signalBundle = await loadEnvironmentalTenantSignals(user, { ...ctx, mock_signals: ctx.mock_signals });
  const bindings = ENVIRONMENTAL_PILOT_BLOCK_IDS.map((id) => invokeEnvironmentalBlockBridge(id, signalBundle, { tenant_id: user?.company_id }));
  const engineContext = buildEnvironmentalEngineContext(signalBundle, bindings);

  let centersRaw = [
    buildEmissionsCenter(bindings, signalBundle),
    buildEsgCenter(bindings),
    buildComplianceCenter(bindings),
    buildWasteCenter(bindings),
    buildRiskCenter(bindings),
    buildTelemetryCenter(bindings),
    buildTimelineCenter(bindings),
    buildEnvironmentalAiCenter(bindings, engineContext),
    buildEnvironmentalNarrativeCenter(bindings, engineContext),
    buildEnvironmentalDecisionSupport(bindings, engineContext)
  ];

  centersRaw = balanceAuditPressure(resolveRegulatoryPriority(balanceEnvironmentalCenters(centersRaw, payload.profile_code)), flags.maxCriticalAlerts());

  let widgets =
    payload.widgets_promoted?.length > 0
      ? payload.widgets_promoted
      : resolvePromotedEnvironmentalWidgetsFromShadow(shadow, { max_widgets: 8 });
  const genericSet = new Set(ENVIRONMENTAL_GENERIC_WIDGET_IDS);
  widgets = widgets.map((w) => (genericSet.has(String(w.id || '')) ? { ...w, collapsed_generic: true, visible: false } : w));

  const suppression = buildEnvironmentalSuppressionPlan(payload.widgets_legacy || []);
  const densityOut = applyEnvironmentalDensityGovernor(centersRaw, widgets.filter((w) => !w.collapsed_generic));
  const usefulness = optimizeCockpitUsefulness(densityOut.centers, envPilot?.engine_bridge?.binding_ratio ?? 0.75);
  let consolidated = {
    centers: densityOut.centers,
    widgets: densityOut.widgets,
    suppression,
    density: densityOut.density,
    usefulness,
    decision_support: centersRaw.find((c) => c.center_id === 'environmental_decision_support'),
    environmental_contextual_ai: engineContext.ai,
    environmental_narrative: engineContext.narrative,
    telemetry_readiness: signalBundle.telemetry_readiness,
    regulatory_governance: engineContext.governance
  };
  consolidated = superviseEnvironmentalFallback(consolidated, payload);
  const semantic = validateEnvironmentalSemanticPayload(payload, consolidated.centers);
  const promotedCount = consolidated.widgets.filter((w) => w.render_promoted !== false && !w.collapsed_generic).length;
  const specializedRatio = Math.round((promotedCount / Math.max(consolidated.widgets.length, 1)) * 1000) / 1000;
  const opFocus = consolidated.centers.filter((c) => c.layer === 'governance' || c.layer === 'operational').length / Math.max(consolidated.centers.length, 1);
  const { environmental_cognitive_health } = computeEnvironmentalCognitiveHealth({
    specialized_ratio: specializedRatio,
    compliance_focus: opFocus,
    usefulness: usefulness.usefulness,
    telemetry_ready: signalBundle.telemetry_readiness === 'ready',
    regulatory_ok: semantic.ok
  });

  return {
    phase: 'P1-ENV',
    cockpit_mode: 'environmental_native',
    consolidation_applied: true,
    global_replace: false,
    centers: consolidated.centers,
    widgets: consolidated.widgets,
    suppression: consolidated.suppression,
    density: consolidated.density,
    usefulness: consolidated.usefulness,
    decision_support: consolidated.decision_support,
    environmental_cognitive_health,
    semantic_validation: semantic,
    environmental_contextual_questions: engineContext.ai?.contextual_questions,
    specialized_summary: engineContext.narrative?.paragraphs?.join(' ') || null,
    telemetry_readiness: signalBundle.telemetry_readiness
  };
}

module.exports = { consolidateEnvironmentalCockpit };
