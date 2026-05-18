'use strict';

let obs;
try {
  obs = require('../../../services/operational/enterpriseObservabilityRuntime');
} catch {
  obs = { recordMetric: () => {} };
}

function recordPublicationMetrics(pack) {
  const t = pack.tenant ? String(pack.tenant).slice(0, 8) : 'none';
  const safe = (name, val) => {
    if (val == null || Number.isNaN(Number(val))) return;
    try {
      obs.recordMetric(name, Number(val), { tenant: t, domain: 'environment' });
    } catch (_e) {
      /* never throw */
    }
  };

  safe('environment_publication_runtime_ms', pack.publication_runtime_ms);
  safe('environment_navigation_resolution_ms', pack.navigation_resolution_ms);
  safe('environment_contextual_visibility_ms', pack.contextual_visibility_ms);
  safe('environment_rollout_readiness_score', pack.rollout_readiness_score);
  safe('environment_cognitive_pressure_score', pack.cognitive_pressure_score);
  safe('environment_publication_density_score', pack.publication_density_score);
  safe('environment_sidebar_stability_score', pack.sidebar_stability_score);
  safe('environment_multi_domain_coexistence_score', pack.multi_domain_coexistence_score);
}

module.exports = { recordPublicationMetrics };
