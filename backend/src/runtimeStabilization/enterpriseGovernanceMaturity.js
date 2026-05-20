'use strict';

function evaluateGovernanceMaturity(signals = {}) {
  const effectiveness = signals.governance_effectiveness_score ?? 0.84;
  const fatigue = signals.governance_fatigue ?? 0.2;
  const governance_maturity = Number(Math.max(0, Math.min(1, effectiveness - fatigue * 0.3)).toFixed(4));
  return { governance_maturity, fatigue_penalty: fatigue > 0.5 };
}

module.exports = { evaluateGovernanceMaturity };
