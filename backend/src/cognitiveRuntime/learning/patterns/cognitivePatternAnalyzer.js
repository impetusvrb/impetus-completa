'use strict';

function analyzeCognitivePatterns(store = {}, current = {}) {
  const snapshots = store.snapshots || [];
  const recurring_overload = snapshots.filter((s) => s.fatigue_detected).length >= 2;
  const recurring_low_usefulness = snapshots.filter((s) => (s.usefulness_score ?? 1) < 0.65).length >= 2;
  return {
    patterns_detected: [
      ...(recurring_overload ? [{ id: 'recurring_overload', confidence: 0.7 }] : []),
      ...(recurring_low_usefulness ? [{ id: 'recurring_low_usefulness', confidence: 0.65 }] : []),
      ...(current.adaptive_orchestration?.adaptation_recommended ? [{ id: 'adaptation_recommended_now', confidence: 0.8 }] : [])
    ],
    auto_apply: false
  };
}

module.exports = { analyzeCognitivePatterns };
