'use strict';

function extractCockpitPatterns(store = {}) {
  const snapshots = store.snapshots || [];
  if (snapshots.length < 2) return { patterns: [], insufficient_history: true };
  const fatigueHits = snapshots.filter((s) => s.fatigue_detected).length;
  const lowUse = snapshots.filter((s) => (s.usefulness_score ?? 1) < 0.65).length;
  const patterns = [];
  if (fatigueHits >= 2) patterns.push({ id: 'persistent_fatigue', count: fatigueHits, supervised: true });
  if (lowUse >= 2) patterns.push({ id: 'low_usefulness_trend', count: lowUse, supervised: true });
  return { patterns, patterns_detected: patterns, insufficient_history: false };
}

module.exports = { extractCockpitPatterns };
