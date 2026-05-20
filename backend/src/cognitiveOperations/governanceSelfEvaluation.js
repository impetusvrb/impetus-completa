'use strict';

function evaluateGovernanceSelf(signals = {}) {
  const layers = signals.active_layers ?? 3;
  const effectiveness = Math.max(0.5, 0.95 - layers * 0.03 - (signals.entropy ?? 0) * 0.2);
  return {
    governance_effectiveness_score: Number(effectiveness.toFixed(4)),
    supervision_quality: effectiveness >= 0.75 ? 'adequate' : 'needs_review',
    recommend_manual_review: effectiveness < 0.65
  };
}

module.exports = { evaluateGovernanceSelf };
