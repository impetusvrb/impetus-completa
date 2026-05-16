'use strict';

const { mean } = require('./qualitySpcEngine');

/** Outliers por IQR */
function iqrOutliers(values, factor = 1.5) {
  const x = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (x.length < 4) return { outliers: [], q1: null, q3: null };
  const q = (p) => {
    const idx = (x.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return x[lo];
    return x[lo] + (x[hi] - x[lo]) * (idx - lo);
  };
  const q1 = q(0.25);
  const q3 = q(0.75);
  const iqr = q3 - q1;
  const low = q1 - factor * iqr;
  const high = q3 + factor * iqr;
  const outliers = [];
  values.forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    if (v < low || v > high) outliers.push({ index: i, value: v, low, high });
  });
  return { outliers, q1, q3, iqr, low, high };
}

/** Z-score simples vs média amostral */
function zScoreAnomalies(values, threshold = 3.5) {
  const x = values.filter((v) => Number.isFinite(v));
  const m = mean(x);
  const variance = x.reduce((s, v) => s + (v - m) ** 2, 0) / (x.length > 1 ? x.length - 1 : 1);
  const sd = Math.sqrt(variance) || 1e-9;
  const anomalies = [];
  values.forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    const z = Math.abs((v - m) / sd);
    if (z >= threshold) anomalies.push({ index: i, value: v, z });
  });
  return { mean: m, sd, anomalies };
}

module.exports = {
  iqrOutliers,
  zScoreAnomalies
};
