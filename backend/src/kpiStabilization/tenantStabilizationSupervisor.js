'use strict';

const { getTenantStabilizationState, recordTenantObservation } = require('./tenantDeliveryIsolation');
const { protectTenantPrecision } = require('./tenantPrecisionProtection');
const { correctRuntimeDelivery } = require('./runtimeDeliveryCorrectionEngine');

function superviseTenantStabilization(tenantId, user, kpiPayload, ctx = {}) {
  recordTenantObservation(tenantId);
  const protection = protectTenantPrecision(tenantId, ctx);
  const correction = correctRuntimeDelivery(user, kpiPayload, { ...ctx, tenant_id: tenantId });
  return {
    tenant_id: tenantId,
    state: getTenantStabilizationState(tenantId),
    protection,
    correction,
    gradual_stabilization: true,
    auto_correct: false
  };
}

module.exports = { superviseTenantStabilization };
