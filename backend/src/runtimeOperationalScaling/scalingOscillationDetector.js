'use strict';

function detectScalingOscillation(ctx = {}) {
  const summaryOsc = (ctx.summary_oscillation_events ?? 0) > 1;
  const kpiOsc = ctx.kpi_oscillation === true;
  const z10Osc = ctx.tenant_stability?.oscillation?.oscillating === true;
  const oscillating = summaryOsc || kpiOsc || z10Osc;

  return {
    oscillating,
    scaling_unstable: oscillating,
    severity: oscillating ? 'medium' : 'low'
  };
}

module.exports = { detectScalingOscillation };
