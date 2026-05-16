'use strict';

/** PPM = defects / inspected * 1e6 */
function ppm(defects, inspected) {
  if (!inspected || inspected <= 0) return null;
  return (Number(defects || 0) / inspected) * 1e6;
}

function lotRejectionRate(rejectedLots, totalLots) {
  if (!totalLots) return null;
  return (rejectedLots / totalLots) * 100;
}

function supplierTrendDelta(series) {
  if (!Array.isArray(series) || series.length < 2) return { delta: null };
  const a = series[series.length - 1];
  const b = series[0];
  return { delta: a - b, from: b, to: a };
}

module.exports = {
  ppm,
  lotRejectionRate,
  supplierTrendDelta
};
