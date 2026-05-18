'use strict';

let obs;
try {
  obs = require('../services/operational/enterpriseObservabilityRuntime');
} catch {
  obs = { recordMetric: () => {} };
}

function recordEnterpriseHardeningMetrics(tenantId, pack) {
  const t = tenantId ? String(tenantId).slice(0, 8) : 'none';
  const safe = (name, val) => {
    if (val == null || Number.isNaN(Number(val))) return;
    try {
      obs.recordMetric(name, Number(val), { tenant: t, layer: 'enterprise_hardening' });
    } catch (_e) {
      /* never throw */
    }
  };
  safe('enterprise_hardening_runtime_ms', pack.enterprise_hardening_runtime_ms);
  safe('enterprise_telemetry_pressure_score', pack.telemetry?.resilience?.telemetry_pressure_score);
  safe('enterprise_operational_pressure_score', pack.enterprise_operational_pressure_score);
  safe('enterprise_contextual_maturity_score', pack.maturity?.ecosystem?.maturity_score);
  safe('enterprise_cross_domain_readiness', pack.enterprise_cross_domain_readiness);
  safe('enterprise_executive_density_score', pack.cognitive?.executive?.executive_overload ? 0.8 : 0.3);
}

module.exports = { recordEnterpriseHardeningMetrics };
