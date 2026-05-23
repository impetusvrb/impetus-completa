'use strict';

function learnConvergence(store = {}, payload = {}) {
  const snapshots = store.snapshots || [];
  const convergenceVals = snapshots.map((s) => s.convergence_index).filter((v) => v != null);
  const current = payload.executive_cognitive_runtime?.strategic?.convergence;
  const trends = [];
  if (convergenceVals.length >= 2) {
    const avg = convergenceVals.reduce((a, b) => a + b, 0) / convergenceVals.length;
    trends.push({ avg: Math.round(avg * 100) / 100, direction: current != null && current < avg ? 'declining' : 'stable' });
  }
  return { convergence_trends: trends, current_convergence: current ?? null };
}

module.exports = { learnConvergence };
