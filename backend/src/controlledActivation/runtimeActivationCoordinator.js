'use strict';

const { validateContextualDelivery } = require('./contextualDeliveryValidator');
const { validateHierarchyDelivery } = require('./hierarchyDeliveryValidator');
const { validateOperationalTargeting } = require('./operationalTargetingValidator');
const { detectActivationIssues } = require('./activationStabilizationEngine');
const { assessRuntimeActivationHealth } = require('./runtimeActivationHealth');
const { recordActivationSample } = require('./productionActivationTelemetry');

function coordinateActivationReadiness(user, ctx = {}) {
  const delivery = validateContextualDelivery(user, ctx);
  const hierarchy = validateHierarchyDelivery(user, ctx);
  const targeting = validateOperationalTargeting(user, ctx);
  const stabilization = detectActivationIssues({
    leakage_count: ctx.precision_delivery?.modules?.ineligible?.length || 0,
    underdelivery: ctx.runtime_consistency?.interchannel?.divergence_detected,
    hierarchy_mismatch: hierarchy.denied_count > 0,
    interchannel_divergence: ctx.runtime_consistency?.interchannel?.divergence_detected,
    delivery_instability: delivery.contextual_delivery_accuracy < 0.7
  });

  const readiness_ok = delivery.valid && hierarchy.valid && targeting.valid && stabilization.issues.length <= 1;
  const metrics = {
    contextual_delivery_accuracy: delivery.contextual_delivery_accuracy,
    hierarchy_accuracy: hierarchy.hierarchy_accuracy,
    module_delivery_accuracy: delivery.contextual_delivery_accuracy,
    KPI_delivery_accuracy: ctx.kpi_precision ?? 0.88,
    summary_delivery_accuracy: ctx.summary_precision ?? 0.87,
    activation_stability: stabilization.activation_stability,
    runtime_activation_confidence: targeting.targeting_confidence
  };

  const health = assessRuntimeActivationHealth(metrics);
  recordActivationSample({ ...metrics, rollout_health: health.rollout_health });

  return {
    readiness_ok,
    delivery,
    hierarchy,
    targeting,
    stabilization,
    health,
    stability_ok: stabilization.activation_stability >= 0.75
  };
}

module.exports = { coordinateActivationReadiness };
