'use strict';

function analyzeTenantExpansionRisk(pack = {}) {
  const unstable = pack.stability?.unstable === true || pack.scaling?.scaling_unstable === true;
  const overload = pack.pressure?.load?.overload === true || pack.governance_load?.overload === true;
  const lowMaturity = (pack.scaling_maturity?.scaling_maturity_score ?? 1) < 0.45;
  const risk_score = (unstable ? 0.35 : 0) + (overload ? 0.35 : 0) + (lowMaturity ? 0.3 : 0);

  return {
    risk_score,
    high_risk: risk_score >= 0.55,
    factors: [
      unstable && 'instability',
      overload && 'governance_overload',
      lowMaturity && 'low_scaling_maturity'
    ].filter(Boolean)
  };
}

module.exports = { analyzeTenantExpansionRisk };
