'use strict';

const { kpiKey } = require('../kpiRuntimeEnforcement/domainKpiIsolation');

function detectKpiVisibilityOscillation(before = [], after = [], ctx = {}) {
  const history = ctx.kpi_visibility_history || [];
  const b = new Set(before.map(kpiKey));
  const a = new Set(after.map(kpiKey));
  let delta = 0;
  for (const k of b) if (!a.has(k)) delta++;
  for (const k of a) if (!b.has(k)) delta++;
  let historyOscillation = false;
  if (history.length >= 2) {
    const l = history[history.length - 1]?.count ?? 0;
    const p = history[history.length - 2]?.count ?? 0;
    historyOscillation = Math.abs(l - p) >= 3;
  }
  return {
    oscillation_detected: delta >= 3 || historyOscillation,
    delta,
    before_count: before.length,
    after_count: after.length,
    stable: delta < 3 && !historyOscillation
  };
}

module.exports = { detectKpiVisibilityOscillation };
