'use strict';

function analyzeFatigueLearning(store = {}) {
  const snapshots = store.snapshots || [];
  const fatigue = snapshots.filter((s) => s.fatigue_detected);
  return {
    fatigue_patterns: fatigue.length >= 2 ? [{ id: 'persistent_fatigue', occurrences: fatigue.length }] : [],
    persistent: fatigue.length >= 2
  };
}

module.exports = { analyzeFatigueLearning };
