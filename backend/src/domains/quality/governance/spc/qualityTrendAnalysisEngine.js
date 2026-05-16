'use strict';

/**
 * Tendência linear simples (drift) sobre série temporal.
 */
function linearRegression(xs, ys) {
  const pts = xs.map((x, i) => ({ x: Number(x), y: Number(ys[i]) })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const n = pts.length;
  if (n < 2) return { error: 'insufficient_points' };
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of pts) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  return { slope, intercept, n, mean_x: mx, mean_y: my };
}

function detectDrift(ys, opts = {}) {
  const xs = ys.map((_, i) => i);
  const reg = linearRegression(xs, ys);
  if (reg.error) return reg;
  const threshold = opts.slope_threshold_per_step ?? 0;
  const drift_significant = Math.abs(reg.slope) > threshold;
  return {
    ...reg,
    drift_significant,
    direction: reg.slope > 0 ? 'up' : reg.slope < 0 ? 'down' : 'flat'
  };
}

module.exports = {
  linearRegression,
  detectDrift
};
