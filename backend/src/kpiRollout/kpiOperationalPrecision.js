'use strict';

const { validateOperationalKpiDelivery } = require('./operationalKpiDeliveryValidator');
const { stabilizeKpiDelivery } = require('./kpiDeliveryStabilization');

function measureKpiOperationalPrecision(user, kpiPayload, ctx = {}) {
  const delivery = validateOperationalKpiDelivery(user, kpiPayload, ctx);
  const stabilization = stabilizeKpiDelivery(user, kpiPayload, ctx);

  return {
    KPI_operational_alignment: delivery.KPI_delivery_confidence,
    hierarchy_integrity: delivery.hierarchy.hierarchy_accuracy,
    domain_isolation: delivery.domain.domain_isolation_score,
    operational_stability: stabilization.KPI_runtime_stability
  };
}

module.exports = { measureKpiOperationalPrecision };
