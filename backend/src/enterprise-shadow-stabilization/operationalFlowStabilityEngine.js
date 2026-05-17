'use strict';

/**
 * Estabilidade de fluxo — detecta loops e instabilidade de navegação.
 */
function analyzeFlowStability(ctx = {}) {
  const samples = ctx.samples || [];
  const loopCount = samples.filter((s) => s.loop_detected || s.repeated_navigation).length;
  const n = samples.length || 1;
  const loopRate = loopCount / n;
  const depthAvg =
    samples.reduce((a, s) => a + (Number(s.navigation_depth) || 0), 0) / n;
  const stable = loopRate < 0.15 && depthAvg <= 5;
  return {
    ok: true,
    stable,
    loop_rate: loopRate,
    avg_navigation_depth: depthAvg,
    flow_stability_score: Math.max(0, Math.min(100, Math.round(100 - loopRate * 120 - depthAvg * 3)))
  };
}

module.exports = { analyzeFlowStability };
