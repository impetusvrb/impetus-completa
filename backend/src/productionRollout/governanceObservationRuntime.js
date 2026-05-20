'use strict';

const flags = require('./config/productionRolloutFeatureFlags');
const { logProductionRollout } = require('./productionRolloutLogger');
const { assessActivationHealth } = require('./governanceActivationHealth');

function observeProductionRuntime(ctx = {}) {
  if (!flags.isRuntimeObservationEnabled() && !ctx.force) {
    return { observing: false, reason: 'runtime_observation_off' };
  }

  const health = assessActivationHealth(ctx);
  let shadow = {};
  try {
    shadow = require('../runtimeValidation/shadowRuntimeValidator').validateShadowRuntime(ctx);
  } catch {
    shadow = {};
  }

  let anomalies = { stable: true, anomalies: [] };
  try {
    anomalies = require('../runtimeValidation/governanceRuntimeAnomalyDetector').detectAnomalies(ctx);
  } catch {
    /* optional */
  }

  const observation = {
    observing: true,
    observed_at: new Date().toISOString(),
    tenant_id: ctx.tenant_id || null,
    health,
    shadow,
    anomalies,
    stable: health.activation_healthy && anomalies.stable && shadow.passed !== false,
    auto_remediation: false
  };

  logProductionRollout('PRODUCTION_GOVERNANCE_OBSERVATION', {
    stable: observation.stable,
    tenant_id: ctx.tenant_id
  });

  if (observation.stable) {
    logProductionRollout('PRODUCTION_GOVERNANCE_STABLE', { tenant_id: ctx.tenant_id });
  } else {
    logProductionRollout('PRODUCTION_GOVERNANCE_DEGRADED', { tenant_id: ctx.tenant_id });
  }

  return observation;
}

module.exports = { observeProductionRuntime };
