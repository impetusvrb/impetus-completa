'use strict';

const { buildOperationalContinuity } = require('../continuity/zOperationalContinuityRuntime');

function buildOperationalContext(tenantId, user = {}) {
  const ops = buildOperationalContinuity(tenantId);
  const saturation = Number(
    Math.min(1, (ops.open_incidents || 0) * 0.08 + (ops.open_tasks || 0) * 0.04 + (ops.critical_incidents || 0) * 0.2)
      .toFixed(3)
  );
  return {
    tenant_id: tenantId,
    user_id: user?.id || null,
    open_incidents: ops.open_incidents,
    open_tasks: ops.open_tasks,
    critical_incidents: ops.critical_incidents,
    operational_saturation: saturation,
    state:
      saturation > 0.7 ? 'overloaded' : saturation > 0.4 ? 'busy' : saturation > 0.1 ? 'active' : 'idle'
  };
}

module.exports = { buildOperationalContext };
