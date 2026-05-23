'use strict';

function resolveDynamicPriority(usefulness = {}, fatigue = {}) {
  const shifts = [];
  if (usefulness.low_usefulness) shifts.push({ domain: 'top_relevance', action: 'elevate', supervised: true });
  if (fatigue.fatigue_detected) shifts.push({ domain: 'alerts', action: 'deprioritize', supervised: true });
  return { priority_shift_detected: shifts, auto_applied: false };
}

module.exports = { resolveDynamicPriority };
