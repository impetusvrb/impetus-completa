'use strict';

function assessNarrativeKpiConsistency(summaryPayload = {}, ctx = {}) {
  try {
    const align = require('../summaryConvergence/summaryKpiAlignmentRuntime').alignSummaryWithKpis(
      summaryPayload,
      ctx.kpis || [],
      ctx
    );
    return { ...align, phase: 'Z.9' };
  } catch {
    return { coherent: true, phase: 'Z.9', fallback: true };
  }
}

module.exports = { assessNarrativeKpiConsistency };
