'use strict';

function analyzeEnterpriseAlignment(store = {}) {
  const snapshots = store.snapshots || [];
  const aligned = snapshots.filter((s) => s.convergence_index >= 0.65).length;
  return { alignment_health: aligned / Math.max(snapshots.length, 1), healthy: aligned >= snapshots.length * 0.6 };
}

module.exports = { analyzeEnterpriseAlignment };
