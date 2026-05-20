'use strict';

const flags = require('./config/productionRolloutFeatureFlags');
const { logProductionRollout } = require('./productionRolloutLogger');

function superviseRuntime(ctx = {}) {
  let runtime = null;
  let validation = null;

  try {
    const { collectRuntimeSnapshot } = require('../governanceOperations/governanceRuntimeCoordinator');
    runtime = collectRuntimeSnapshot(ctx);
  } catch {
    runtime = null;
  }

  if (flags.isProductionRolloutEnabled() || ctx.force) {
    try {
      const { runRuntimeValidation } = require('../runtimeValidation/governanceRuntimeValidation');
      validation = runRuntimeValidation({ force: ctx.force, simulate: ctx.simulate !== false, allow_hold: true });
    } catch {
      validation = null;
    }
  }

  const supervised = {
    supervised: true,
    auto_executed: false,
    runtime,
    validation,
    observation_required: flags.isRuntimeObservationEnabled() || ctx.force,
    stabilization_required: flags.isGovernanceStabilizationEnabled() || ctx.force
  };

  logProductionRollout('PRODUCTION_GOVERNANCE_OBSERVATION', {
    tenant_id: ctx.tenant_id,
    validation_passed: validation?.passed
  });

  return supervised;
}

module.exports = { superviseRuntime };
