'use strict';

function analyzeProductionPerformance(timings = {}) {
  const renderMs = timings.render_ms ?? timings.total_ms ?? 0;
  const compositionMs = timings.composition_ms ?? 0;
  const safe = renderMs < 500 && compositionMs < 300;
  return {
    render_ms: renderMs,
    composition_ms: compositionMs,
    performance_safe: safe,
    degradation: renderMs > 800 ? 'high' : renderMs > 500 ? 'medium' : 'low'
  };
}

module.exports = { analyzeProductionPerformance };
