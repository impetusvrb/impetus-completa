'use strict';

function analyzeOrchestrationPerformance(timings = {}) {
  const ms = timings.total_ms ?? 0;
  return { runtime_safe: ms < 400, orchestration_ms: ms, cost_acceptable: ms < 600 };
}

module.exports = { analyzeOrchestrationPerformance };
