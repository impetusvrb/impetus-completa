'use strict';

function analyzeUsefulnessTrends(store = {}) {
  const snapshots = store.snapshots || [];
  const scores = snapshots.map((s) => s.usefulness_score).filter((v) => v != null);
  if (scores.length < 2) return { usefulness_trends: [], trend: 'insufficient_data' };
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const latest = scores[scores.length - 1];
  return {
    usefulness_trends: [{ avg: Math.round(avg * 100) / 100, latest, direction: latest >= avg ? 'stable' : 'declining' }],
    trend: latest >= avg ? 'stable' : 'declining'
  };
}

module.exports = { analyzeUsefulnessTrends };
