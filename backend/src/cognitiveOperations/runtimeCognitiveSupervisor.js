'use strict';

const phaseN = require('./config/phaseNFeatureFlags');
const { logPhaseN } = require('./phaseNLogger');
const { coordinateGovernanceOperations } = require('./governanceOperationalCoordinator');

function superviseRuntime(user, ctx = {}) {
  const coordination = coordinateGovernanceOperations(ctx);
  const observe = phaseN.isEnterpriseOperationsObservabilityEnabled() || ctx.force_observe;

  if (observe) {
    logPhaseN('RUNTIME_SUPERVISION_TICK', {
      user_id: user?.id,
      tenant_id: user?.company_id,
      active_layers: coordination.active_layers,
      shadow_only: !phaseN.isEnterpriseCognitiveOperationsEnabled()
    });
  }

  return {
    supervision_active: observe,
    enforcement_active: phaseN.isEnterpriseCognitiveOperationsEnabled(),
    shadow_only: !phaseN.isEnterpriseCognitiveOperationsEnabled(),
    coordination,
    supervised_at: new Date().toISOString()
  };
}

module.exports = { superviseRuntime };
