'use strict';

function assessTenantScalingMaturity(z10Pack = {}) {
  const maturity = z10Pack.tenant_governance_maturity?.maturity_score ?? z10Pack.maturity_score ?? 0.5;
  const sustainability = z10Pack.runtime_sustainability?.sustainability_score ?? 0.5;
  const score = (maturity * 0.55 + sustainability * 0.45);

  return {
    scaling_maturity_score: score,
    mature: score >= 0.6,
    unstable: score < 0.4
  };
}

module.exports = { assessTenantScalingMaturity };
