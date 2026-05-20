'use strict';

const phaseT = require('./config/phaseTFeatureFlags');
const { measureKpiContextualPrecision } = require('./kpiContextualPrecision');
const { measureKpiOperationalPrecision } = require('./kpiOperationalPrecision');

function computeKpiPrecisionRuntime(user, kpiPayload, ctx = {}) {
  const contextual = measureKpiContextualPrecision(user, kpiPayload, ctx);
  const operational = measureKpiOperationalPrecision(user, kpiPayload, ctx);

  const precision = Number(
    (
      (contextual.KPI_contextual_precision +
        operational.KPI_operational_alignment +
        operational.hierarchy_integrity) /
      3
    ).toFixed(4)
  );

  return {
    KPI_precision: precision,
    KPI_delivery_accuracy: operational.KPI_operational_alignment,
    KPI_contextual_precision: contextual.KPI_contextual_precision,
    KPI_hierarchy_integrity: operational.hierarchy_integrity,
    KPI_operational_alignment: operational.KPI_operational_alignment,
    KPI_delivery_confidence: Number(
      ((precision + operational.operational_stability) / 2).toFixed(4)
    ),
    contextual,
    operational,
    enforcement_active: phaseT.isKpiPrecisionRuntimeEnabled(),
    shadow_only: !phaseT.isKpiPrecisionRuntimeEnabled()
  };
}

module.exports = { computeKpiPrecisionRuntime };
