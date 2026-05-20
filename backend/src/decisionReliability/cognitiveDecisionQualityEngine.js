'use strict';

function scoreDecisionQuality(signals = {}) {
  let score = 0.75;
  if (signals.has_provenance) score += 0.1;
  if (signals.contextual_confidence > 0.8) score += 0.08;
  if (signals.degraded) score -= 0.2;
  if (signals.ambiguous) score -= 0.15;
  if (signals.low_consistency) score -= 0.12;
  return Number(Math.max(0.15, Math.min(1, score)).toFixed(4));
}

module.exports = { scoreDecisionQuality };
