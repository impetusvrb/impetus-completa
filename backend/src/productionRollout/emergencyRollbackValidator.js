'use strict';

function validateEmergencyRollback(ctx = {}) {
  let emergency = null;
  try {
    const phaseJ = require('../governanceOperations/config/phaseJFeatureFlags');
    if (phaseJ.isGovernanceEmergencyControlsEnabled() || ctx.force) {
      const { prepareEmergency } = require('../governanceOperations/governanceEmergencyControls');
      emergency = prepareEmergency({
        approved_by: ctx.approved_by,
        tenant_id: ctx.tenant_id,
        force: ctx.force
      });
    }
  } catch {
    emergency = { prepared: false };
  }

  return {
    emergency_available: emergency?.prepared === true,
    emergency_plan: emergency,
    auto_executed: false,
    requires_manual_execution: true,
    rollback_auditable: true
  };
}

module.exports = { validateEmergencyRollback };
