'use strict';

let obs;
try {
  obs = require('../services/operational/enterpriseObservabilityRuntime');
} catch {
  obs = { recordMetric: () => {} };
}

function recordEcosystemCorrelationMetrics(tenantId, pack) {
  const t = tenantId ? String(tenantId).slice(0, 8) : 'none';
  const safe = (name, val) => {
    if (val == null || Number.isNaN(Number(val))) return;
    try {
      obs.recordMetric(name, Number(val), { tenant: t, layer: 'ecosystem_correlation' });
    } catch (_e) {
      /* never throw */
    }
  };
  safe('ecosystem_correlation_runtime_ms', pack.ecosystem_correlation_runtime_ms);
  safe('ecosystem_cross_domain_density_score', pack.ecosystem_cross_domain_density_score);
  safe('ecosystem_operational_pressure_score', pack.ecosystem_operational_pressure_score);
  safe('ecosystem_telemetry_correlation_score', pack.telemetry?.telemetry_correlation_score);
  safe('ecosystem_contextual_maturity_score', pack.maturity?.ecosystem_contextual_maturity_score);
  safe('ecosystem_cross_domain_readiness', pack.ecosystem_cross_domain_readiness);
  safe('ecosystem_executive_density_score', pack.executive?.executive_density_score);
}

module.exports = { recordEcosystemCorrelationMetrics };
