'use strict';

const phaseL = require('./config/phaseLFeatureFlags');
const { buildRuntimeContextualTarget } = require('./runtimeContextualTargeting');

function governContextualDelivery(user, payload, ctx = {}) {
  const target = buildRuntimeContextualTarget(user, ctx);
  const governance_delivery_confidence = Number(
    ((target.contextual_precision_score + target.semantic_precision_score) / 2).toFixed(4)
  );

  return {
    payload,
    governance_delivery_confidence,
    runtime_contextual_integrity: target.runtime_contextual_integrity,
    contextual_target: target,
    enforcement_active: false,
    shadow_only: !phaseL.isPreciseModuleDeliveryEnabled(),
    observe: phaseL.isRuntimePrecisionObservabilityEnabled()
  };
}

module.exports = { governContextualDelivery };
