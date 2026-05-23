'use strict';

function scoreEnvironmentalMaturity(signalBundle = {}, governance = {}) {
  let score = 0.4;
  if (signalBundle.ok) score += 0.15;
  if (signalBundle.telemetry_readiness === 'ready') score += 0.2;
  if (!governance.risk?.regulatory_risk) score += 0.15;
  if (governance.esg?.contextual) score += 0.1;
  return { maturity_score: Math.round(Math.min(1, score) * 100) / 100 };
}

module.exports = { scoreEnvironmentalMaturity };
