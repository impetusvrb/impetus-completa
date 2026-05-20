'use strict';

const phaseT = require('./config/phaseTFeatureFlags');
const { getKpiRolloutStatus, assessKpiRolloutReadiness } = require('./kpiGovernanceActivationEngine');
const { coordinateKpiRolloutReadiness } = require('./kpiRuntimeActivationCoordinator');
const { stabilizeKpiDelivery } = require('./kpiDeliveryStabilization');
const { computeKpiPrecisionRuntime } = require('./kpiPrecisionRuntime');
const { validateOperationalKpiDelivery } = require('./operationalKpiDeliveryValidator');
const { validateKpiTargeting } = require('./kpiTargetingValidator');

function isKpiRolloutLayerActive() {
  return (
    phaseT.isKpiGovernanceObservabilityEnabled() ||
    phaseT.isKpiGovernanceRolloutEnabled() ||
    phaseT.isKpiTargetingValidationEnabled()
  );
}

function enrichKpiGovernanceRollout(user, kpiPayload, ctx = {}) {
  if (!isKpiRolloutLayerActive() && !ctx.force) {
    return { payload: kpiPayload, kpi_governance: null };
  }

  const coordination = coordinateKpiRolloutReadiness(user, kpiPayload, {
    ...ctx,
    functional_axis: ctx.functional_axis || user?.functional_axis || user?.functional_area,
    tenant_id: user?.company_id
  });
  const targeting = validateKpiTargeting(user, kpiPayload, ctx);

  const kpi_governance = {
    phase: 'T',
    shadow_only: !phaseT.isKpiGovernanceRolloutEnabled(),
    observability: phaseT.isKpiGovernanceObservabilityEnabled(),
    status: getKpiRolloutStatus({ tenant_id: user?.company_id }),
    readiness_score: coordination.readiness_score,
    auto_activate: false,
    global_activation: false
  };

  const kpi_precision = coordination.precision;
  const kpi_delivery_validation = coordination.stabilization.delivery;
  const kpi_targeting_integrity = {
    targeting_precision: targeting.targeting_precision,
    valid: targeting.valid,
    issues: targeting.issues,
    hierarchy_accuracy: coordination.precision.KPI_hierarchy_integrity
  };

  let payload = kpiPayload;
  if (
    phaseT.isKpiGovernanceRolloutEnabled() &&
    phaseT.isKpiDeliveryStabilizationEnabled() &&
    coordination.stabilization.leakage?.leakage_detected
  ) {
    const list = require('./kpiTargetingValidator').extractKpiList(kpiPayload);
    const leakIds = new Set((coordination.stabilization.leakage.leaks || []).map((l) => l.kpi_id));
    const filtered = list.filter((k) => !leakIds.has(k.id || k.key));
    payload = Array.isArray(kpiPayload) ? filtered : { ...kpiPayload, kpis: filtered };
  }

  return {
    payload,
    kpi_governance,
    kpi_precision,
    kpi_delivery_validation,
    kpi_targeting_integrity
  };
}

module.exports = {
  isKpiRolloutLayerActive,
  enrichKpiGovernanceRollout,
  getKpiRolloutStatus,
  assessKpiRolloutReadiness,
  stabilizeKpiDelivery,
  computeKpiPrecisionRuntime,
  validateOperationalKpiDelivery
};
