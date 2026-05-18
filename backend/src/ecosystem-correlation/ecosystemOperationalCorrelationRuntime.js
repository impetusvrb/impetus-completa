'use strict';

const { ecosystemCrossDomainRuntime } = require('./ecosystemCrossDomainRuntime');

function ecosystemOperationalCorrelationRuntime(ctx = {}) {
  const cross = ecosystemCrossDomainRuntime(ctx);
  const pressure = Math.min(1, (cross.ecosystem_cross_domain_density_score || 0) * 1.1);
  return {
    ok: true,
    cross_domain: cross,
    operational_impacts: Object.entries(cross.domain_pairs || {}).map(([k, v]) => ({
      domain: k,
      score: v.aggregate_score,
      narratives: v.narratives || []
    })),
    ecosystem_operational_pressure_score: pressure,
    assistive_only: true
  };
}

module.exports = { ecosystemOperationalCorrelationRuntime };
