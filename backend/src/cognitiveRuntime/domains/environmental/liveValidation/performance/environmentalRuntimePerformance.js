'use strict';

function analyzeEnvironmentalRuntimePerformance(timings = {}) {
  const ms = timings.total_ms ?? 0;
  return { runtime_performance_safe: ms < 600, render_ms: ms, degradation: ms > 800 ? 'high' : 'low' };
}

module.exports = { analyzeEnvironmentalRuntimePerformance };
