'use strict';

function assessSummaryGovernanceMaturity(pack = {}) {
  const conv = pack.convergence?.convergence_score ?? 0.5;
  const kpi = pack.kpi?.health_score ?? pack.kpi?.maturity?.maturity_score ?? 0.5;
  const maturity = Number(((conv + kpi) / 2).toFixed(4));
  return { maturity_score: maturity, enterprise_ready: maturity >= 0.72, phase: 'Z.8' };
}

module.exports = { assessSummaryGovernanceMaturity };
