'use strict';

const { computeThroughputVariance } = require('./throughputVarianceEngine');

function analyzeBottlenecks(lines = [], shiftRows = []) {
  const variance = computeThroughputVariance(lines);
  const scored = lines.map((ln) => {
    const target = parseFloat(ln.target_qty || 0);
    const produced = parseFloat(ln.produced_qty || 0);
    const saturation = target > 0 ? produced / target : 0;
    const row = shiftRows.find((r) => r.line_identifier === ln.line_identifier);
    const scrap = parseFloat(row?.scrap_qty || 0);
    const score = Math.round((1 - Math.min(saturation, 1)) * 50 + scrap * 2 + (saturation > 0.95 ? 20 : 0));
    return {
      line_identifier: ln.line_identifier,
      line_name: ln.line_name,
      bottleneck_score: score,
      saturation_pct: target > 0 ? Math.round(saturation * 100) : null,
      queue_pressure: saturation < 0.6 ? 'high' : saturation < 0.85 ? 'medium' : 'low'
    };
  });

  scored.sort((a, b) => b.bottleneck_score - a.bottleneck_score);
  const primary = scored[0] || null;
  const degraded = scored.filter((s) => s.bottleneck_score >= 30);

  return {
    primary_line: primary?.line_identifier || null,
    top_score: primary?.bottleneck_score || 0,
    heatmap: scored.slice(0, 8),
    degraded_lines: degraded,
    throughput_variance: variance,
    flow_constraints: degraded.map((d) => ({
      line: d.line_identifier,
      constraint: d.queue_pressure === 'high' ? 'throughput_ceiling' : 'capacity_buffer'
    }))
  };
}

module.exports = { analyzeBottlenecks };
