'use strict';

function balanceRuntimeAttention(fatigue = {}, usefulness = {}) {
  const shift = [];
  if (fatigue.fatigue_detected && usefulness.low_usefulness) {
    shift.push({ action: 'elevate_top_relevance', supervised: true });
  }
  if (fatigue.executive_fatigue) {
    shift.push({ action: 'reduce_executive_alerts', supervised: true });
  }
  return { priority_shift_detected: shift, auto_applied: false };
}

module.exports = { balanceRuntimeAttention };
