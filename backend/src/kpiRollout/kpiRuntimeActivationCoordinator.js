'use strict';

const { stabilizeKpiDelivery } = require('./kpiDeliveryStabilization');
const { computeKpiPrecisionRuntime } = require('./kpiPrecisionRuntime');
const { recordKpiGovernanceSample } = require('./kpiGovernanceTelemetry');
const { READINESS_THRESHOLD } = require('./tenantKpiRollbackCoordinator');

let _rolloutMemory = { activated: false, at: null, approved_by: null };

function coordinateKpiRolloutReadiness(user, kpiPayload, ctx = {}) {
  const stabilization = stabilizeKpiDelivery(user, kpiPayload, ctx);
  const precision = computeKpiPrecisionRuntime(user, kpiPayload, ctx);

  const readiness_score = Number(
    ((precision.KPI_delivery_confidence + stabilization.KPI_runtime_stability) / 2).toFixed(4)
  );

  const readiness_ok = readiness_score >= (ctx.readiness_threshold ?? READINESS_THRESHOLD) && stabilization.delivery.valid;

  recordKpiGovernanceSample({
    KPI_delivery_accuracy: precision.KPI_delivery_accuracy,
    KPI_contextual_precision: precision.KPI_contextual_precision,
    KPI_hierarchy_integrity: precision.KPI_hierarchy_integrity,
    KPI_operational_alignment: precision.KPI_operational_alignment,
    KPI_delivery_confidence: precision.KPI_delivery_confidence,
    KPI_runtime_stability: stabilization.KPI_runtime_stability
  });

  return {
    readiness_ok,
    readiness_score,
    readiness_threshold: ctx.readiness_threshold ?? READINESS_THRESHOLD,
    stabilization,
    precision,
    stability_ok: stabilization.KPI_runtime_stability >= 0.75
  };
}

function getRolloutMemoryState() {
  return { ..._rolloutMemory };
}

function setRolloutMemoryState(active, meta = {}) {
  _rolloutMemory = {
    activated: !!active,
    at: active ? new Date().toISOString() : null,
    approved_by: meta.approved_by || null,
    tenant_id: meta.tenant_id || null
  };
  return _rolloutMemory;
}

function resetRolloutMemory() {
  _rolloutMemory = { activated: false, at: null, approved_by: null };
}

module.exports = {
  coordinateKpiRolloutReadiness,
  getRolloutMemoryState,
  setRolloutMemoryState,
  resetRolloutMemory,
  READINESS_THRESHOLD
};
