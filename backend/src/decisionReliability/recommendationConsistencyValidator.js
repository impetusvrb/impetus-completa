'use strict';

const _history = new Map();

function validateRecommendationConsistency(key, fingerprint) {
  const prev = _history.get(key);
  _history.set(key, { fingerprint, ts: Date.now() });
  if (!prev) return { consistent: true, oscillation: false };
  const consistent = prev.fingerprint === fingerprint;
  return { consistent, oscillation: !consistent, previous: prev.fingerprint };
}

function clearRecommendationHistory() {
  _history.clear();
}

module.exports = { validateRecommendationConsistency, clearRecommendationHistory };
