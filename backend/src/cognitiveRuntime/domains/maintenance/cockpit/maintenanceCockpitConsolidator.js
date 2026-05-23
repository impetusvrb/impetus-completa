'use strict';

const { loadMaintenanceTenantSignals } = require('../bridge/maintenanceSignalLoader');
const { invokeMaintenanceBlockBridge, buildMaintenanceEngineContext } = require('../bridge/maintenanceEngineBridge');
const { MAINTENANCE_PILOT_BLOCK_IDS } = require('../../../registry/maintenanceCognitiveBlockPack');
const {
  buildReliabilityCenter,
  buildAssetHealthCenter,
  buildPredictiveCenter,
  buildDegradationCenter,
  buildDowntimeCenter,
  buildTelemetryCenter,
  buildMaintenanceDecisionSupport
} = require('./maintenanceCenters');
const { runMaintenanceDensityGovernor, runPredictiveNoiseReducer } = require('../runtime/maintenanceDensityGovernor');
const { validateMaintenanceSemanticPayload } = require('../runtime/maintenanceSemanticValidator');
const { superviseMaintenanceFallback } = require('../runtime/maintenanceFallbackSupervisor');
const { resolvePromotedMaintenanceWidgetsFromShadow } = require('../../../renderPromotion/maintenance/maintenanceWidgetPromotionResolver');
const { optimizeCockpitUsefulness } = require('../../../cockpitConsolidation/runtime/cockpitUsefulnessOptimizer');
const flags = require('../../../config/phaseZM1FeatureFlags');

async function consolidateMaintenanceCockpit(user = {}, payload = {}, ctx = {}, maintPilot = {}) {
  const shadow = maintPilot.shadow_cognitive_cockpit || {};
  const signalBundle = await loadMaintenanceTenantSignals(user, { ...ctx, mock_signals: ctx.mock_signals });
  const engineContext = buildMaintenanceEngineContext(
    signalBundle,
    MAINTENANCE_PILOT_BLOCK_IDS.map((id) => invokeMaintenanceBlockBridge(id, signalBundle, {})),
    ctx
  );

  let centersRaw = [
    buildReliabilityCenter(engineContext),
    buildAssetHealthCenter(engineContext),
    buildPredictiveCenter(engineContext),
    buildDegradationCenter(engineContext),
    buildDowntimeCenter(engineContext),
    buildTelemetryCenter(engineContext)
  ];

  let widgets =
    payload.widgets_promoted?.length > 0
      ? payload.widgets_promoted
      : resolvePromotedMaintenanceWidgetsFromShadow(shadow, { max_widgets: flags.maxWidgets() });

  const alertsRaw = (engineContext.predictive?.failure_risk === 'medium'
    ? [{ severity: 'critical', message: engineContext.predictive.recommendation }]
    : []
  ).filter(Boolean);
  const noise = runPredictiveNoiseReducer(alertsRaw);
  const densityOut = runMaintenanceDensityGovernor(centersRaw, widgets, noise.alerts);
  const usefulness = optimizeCockpitUsefulness(densityOut.centers, maintPilot?.engine_bridge?.binding_ratio ?? 0.75);
  const decisionSupport = buildMaintenanceDecisionSupport([], engineContext);

  let consolidated = {
    centers: densityOut.centers,
    widgets: densityOut.widgets,
    density: densityOut,
    usefulness,
    decision_support: decisionSupport,
    maintenance_contextual_ai: engineContext.ai,
    maintenance_narrative: engineContext.narrative,
    telemetry_readiness: signalBundle.telemetry_readiness,
    predictive_governance: engineContext.predictionGov,
    reliability: engineContext.reliability
  };
  consolidated = superviseMaintenanceFallback(consolidated, payload);
  const semantic = validateMaintenanceSemanticPayload(payload, consolidated.centers);

  return {
    phase: 'Z.M1',
    cockpit_mode: 'maintenance_native',
    consolidation_applied: true,
    global_replace: false,
    auto_maintenance: false,
    auto_action: false,
    centers: consolidated.centers,
    widgets: consolidated.widgets,
    density: consolidated.density,
    usefulness: consolidated.usefulness,
    decision_support: consolidated.decision_support,
    maintenance_cognitive_health: {
      specialized_ratio: consolidated.widgets.filter((w) => w.render_promoted !== false).length / Math.max(consolidated.widgets.length, 1),
      telemetry_ready: signalBundle.telemetry_readiness === 'ready',
      predictive_supervised: engineContext.predictionGov?.predictive_supervised === true,
      semantic_ok: semantic.ok
    },
    semantic_validation: semantic,
    maintenance_contextual_questions: engineContext.ai?.questions,
    specialized_summary: engineContext.narrative?.narrative || null,
    telemetry_readiness: signalBundle.telemetry_readiness,
    engine_context: engineContext
  };
}

module.exports = { consolidateMaintenanceCockpit };
