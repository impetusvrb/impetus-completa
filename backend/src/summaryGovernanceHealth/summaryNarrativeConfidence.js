'use strict';

function assessSummaryNarrativeConfidence(pack = {}) {
  const converged = pack.convergence?.converged === true;
  const noBlind = pack.blindness?.critical_blind_spot !== true;
  const stable = pack.stability?.stable !== false;
  const confidence = converged && noBlind && stable ? 0.88 : noBlind ? 0.6 : 0.38;
  return { narrative_confidence: Number(confidence.toFixed(4)), converged, stable };
}

module.exports = { assessSummaryNarrativeConfidence };
