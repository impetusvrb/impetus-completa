'use strict';

function evaluateRuntimeMaturity(signals = {}) {
  const efficiency = signals.runtime_efficiency ?? 0.85;
  const stability = signals.runtime_stability ?? 0.88;
  const entropy = signals.runtime_entropy_score ?? 0.12;
  const runtime_maturity = Number(((efficiency + stability + (1 - entropy)) / 3).toFixed(4));
  return {
    runtime_maturity,
    level: runtime_maturity >= 0.85 ? 'mature' : runtime_maturity >= 0.7 ? 'developing' : 'immature'
  };
}

module.exports = { evaluateRuntimeMaturity };
