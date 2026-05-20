'use strict';

const phaseU = require('./config/phaseUFeatureFlags');
const { correctContextualTargeting } = require('./contextualTargetingCorrection');
const { resolveKpiSemanticCorrections } = require('./kpiSemanticCorrectionResolver');
const { stabilizeHierarchyDelivery } = require('./hierarchyDeliveryStabilizer');
const { detectKpiLeakage } = require('../kpiRollout/kpiLeakageDetector');
const { detectKpiUnderdelivery } = require('../kpiRollout/kpiUnderdeliveryDetector');
const { detectKpiAuthorityConflicts } = require('../kpiRollout/kpiAuthorityConflictDetector');

function correctRuntimeDelivery(user, kpiPayload, ctx = {}) {
  const targeting = correctContextualTargeting(user, kpiPayload, ctx);
  const semantic = resolveKpiSemanticCorrections(user, kpiPayload, ctx);
  const hierarchy = stabilizeHierarchyDelivery(user, kpiPayload, ctx);
  const leakage = detectKpiLeakage(user, kpiPayload, ctx);
  const underdelivery = detectKpiUnderdelivery(user, kpiPayload, ctx);
  const authority = detectKpiAuthorityConflicts(user, kpiPayload, ctx);

  const issues = [
    ...targeting.corrections,
    ...semantic.resolutions,
    ...hierarchy.stabilization_actions,
    ...(leakage.leaks || []),
    ...(authority.conflicts || [])
  ];

  const stable =
    targeting.stabilized &&
    semantic.semantic_stable &&
    hierarchy.stable &&
    !leakage.leakage_detected &&
    !underdelivery.underdelivery &&
    !authority.conflict_detected;

  return {
    stable,
    delivery_stable: stable,
    corrections: issues,
    recommendations: [
      ...targeting.recommendations,
      ...hierarchy.recommendations,
      ...(underdelivery.underdelivery
        ? [`Completar entrega: faltam ${underdelivery.gap} KPI(s) esperados`]
        : [])
    ],
    targeting,
    semantic,
    hierarchy,
    leakage,
    underdelivery,
    authority,
    auto_correct: false,
    enforcement_active: phaseU.isKpiRuntimeStabilizationEnabled(),
    shadow_only: !phaseU.isKpiRuntimeStabilizationEnabled()
  };
}

module.exports = { correctRuntimeDelivery };
