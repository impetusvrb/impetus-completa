'use strict';

const { alignSummaryWithKpis } = require('./summaryKpiAlignmentRuntime');

function assessNarrativeOperationalIntegrity(summaryPayload = {}, ctx = {}) {
  const alignment = alignSummaryWithKpis(summaryPayload, ctx.kpis || [], ctx);
  return {
    integrity: alignment.coherent ? 0.9 : 0.45,
    contradicts_cockpit: (alignment.contradictions || []).length > 0,
    alignment
  };
}

module.exports = { assessNarrativeOperationalIntegrity };
