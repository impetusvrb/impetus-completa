'use strict';

let obs;
try {
  obs = require('../../../services/operational/enterpriseObservabilityRuntime');
} catch {
  obs = { recordMetric: () => {} };
}

function recordEnvironmentPilotMetrics(tenantId, pack) {
  const t = tenantId ? String(tenantId).slice(0, 8) : 'none';
  const safe = (name, val) => {
    if (val == null || Number.isNaN(Number(val))) return;
    try {
      obs.recordMetric(name, Number(val), { tenant: t, domain: 'environment' });
    } catch (_e) {
      /* never throw */
    }
  };
  safe('environment_pilot_runtime_ms', pack.pilot_runtime_ms);
  safe('environment_operational_ergonomics_score', pack.operational_ergonomics?.ergonomics_score);
  safe('environment_operational_maturity_score', pack.operational_maturity?.maturity_score);
  safe('environment_cognitive_pressure_score', pack.operational_saturation?.operational_saturation_score);
  safe('environment_navigation_density_score', pack.navigation_density?.environment_navigation_density_score);
  safe('environment_rollout_readiness_score', pack.pilot_readiness?.score);
  safe('environment_multi_domain_coexistence_score', pack.multi_domain_coexistence?.environment_multi_domain_coexistence_score);
  safe('environment_operational_adoption_score', pack.operational_adoption?.adoption_score);
}

module.exports = { recordEnvironmentPilotMetrics };
