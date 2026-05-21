'use strict';

function assessPilotGovernanceHealth(tenantId, user = {}, ctx = {}) {
  let observation = { issue_total: 0 };
  try {
    observation = require('../runtimeObservation/runtimeObservationFacade').observeRuntimeDelivery({
      ...ctx,
      tenant_id: tenantId,
      visible_modules: ctx.visible_modules
    });
  } catch {
    observation = { issue_total: 0 };
  }

  return {
    tenant_id: tenantId,
    issue_total: observation.issue_total,
    leakage: observation.leakage,
    hierarchy: observation.hierarchy,
    healthy_enough: (observation.issue_total || 0) < 6,
    recommendation_only: true
  };
}

module.exports = { assessPilotGovernanceHealth };
