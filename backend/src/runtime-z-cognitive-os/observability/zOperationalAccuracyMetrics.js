'use strict';

function computeOperationalAccuracy(reasoning = {}, actions = {}) {
  const r = reasoning?.reasoning_quality || 0;
  const a = (actions?.count || 0) > 0 ? 0.2 : 0;
  return Number(Math.min(1, r * 0.8 + a).toFixed(3));
}

module.exports = { computeOperationalAccuracy };
