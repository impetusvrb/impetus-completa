'use strict';

function assessOperationalExpansionRisk(pack = {}) {
  const unstable = pack.stability?.unstable === true;
  const fatigue = pack.stability?.fatigue?.fatigued === true;
  const lowMaturity = (pack.maturity?.maturity_score ?? 1) < 0.45;

  const risk_score = (unstable ? 0.4 : 0) + (fatigue ? 0.3 : 0) + (lowMaturity ? 0.3 : 0);

  return {
    risk_score,
    expansion_risky: risk_score >= 0.5,
    factors: [
      unstable && 'instability',
      fatigue && 'fatigue',
      lowMaturity && 'low_maturity'
    ].filter(Boolean)
  };
}

module.exports = { assessOperationalExpansionRisk };
