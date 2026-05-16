'use strict';

const { mean } = require('../spc/qualitySpcEngine');

function pearson(xs, ys) {
  const pts = xs.map((x, i) => ({ x: Number(x), y: Number(ys[i]) })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const n = pts.length;
  if (n < 2) return { r: null };
  const mx = mean(pts.map((p) => p.x));
  const my = mean(pts.map((p) => p.y));
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (const p of pts) {
    const zx = p.x - mx;
    const zy = p.y - my;
    num += zx * zy;
    dx += zx * zx;
    dy += zy * zy;
  }
  const den = Math.sqrt(dx * dy);
  return { r: den === 0 ? null : num / den, n };
}

module.exports = {
  pearson
};
