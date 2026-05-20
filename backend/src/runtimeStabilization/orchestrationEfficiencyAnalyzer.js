'use strict';

function analyzeOrchestrationEfficiency(ctx = {}) {
  const hops = ctx.pipeline_hops ?? ctx.active_layers ?? 3;
  const efficiency = Number(Math.max(0.3, 1 - hops * 0.1).toFixed(4));
  return { orchestration_efficiency: efficiency, pipeline_hops: hops };
}

module.exports = { analyzeOrchestrationEfficiency };
