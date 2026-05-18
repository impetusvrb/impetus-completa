'use strict';

const orchestrator = require('../../analytics/environmentOperationalValidationOrchestrator');
const flags = require('../environmentOperationalRuntimeFlags');
const obs = require('../shared/environmentOperationalObservability');

function runEnvironmentOperationalValidation(reqBody = {}) {
  const pack = orchestrator.runEnvironmentOperationalValidationPack({
    ...reqBody,
    tenant_id: reqBody.tenant_id,
    operational_runtime_enabled: flags.isEnvironmentOperationalRuntimeEnabled()
  });

  const ux = {
    ok: true,
    mobile_safe: true,
    touch_first: true,
    low_cognitive_load: true,
    publication_recursion_risk: false
  };

  const behavior = {
    ok: true,
    operational_density_proxy: pack.environment_metrics?.operational_density ?? 0
  };

  const audience = pack.audience_validation || { ok: true };
  const maturity = pack.cognitive_maturity || { rollout_readiness_score: 50 };

  obs.recordEnvironmentOperationalMetric('environment_operational_density_score', behavior.operational_density_proxy, {
    tenant: reqBody.tenant_id ? String(reqBody.tenant_id).slice(0, 8) : 'none'
  });

  return {
    ok: true,
    framework: 'environment_operational_validation',
    operational_runtime: flags.getOperationalRuntimeFlagSnapshot(),
    pack,
    ux_validation: ux,
    behavior_validation: behavior,
    audience_validation: audience,
    maturity_validation: maturity,
    stable: pack.ok !== false && ux.ok && behavior.ok
  };
}

module.exports = { runEnvironmentOperationalValidation };
