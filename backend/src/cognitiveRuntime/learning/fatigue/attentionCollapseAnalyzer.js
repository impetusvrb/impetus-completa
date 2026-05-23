'use strict';

function analyzeAttentionCollapse(store = {}) {
  const snapshots = store.snapshots || [];
  const execFatigue = snapshots.filter((s) => s.executive_fatigue).length;
  return { collapse_risk: execFatigue >= 2, executive_pressure: execFatigue >= 2 };
}

module.exports = { analyzeAttentionCollapse };
