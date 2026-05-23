'use strict';

function analyzeLearningPerformance(ctx = {}) {
  const n = ctx.snapshot_count ?? 0;
  return { runtime_safe: n < 1000, learning_cost_acceptable: true, snapshots: n };
}

module.exports = { analyzeLearningPerformance };
