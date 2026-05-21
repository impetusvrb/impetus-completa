'use strict';

const { assessSummaryCockpitConsistency } = require('./summaryCockpitConsistency');
const { assessNarrativeDashboardAlignment } = require('./narrativeDashboardAlignment');
const { assessNarrativeKpiConsistency } = require('./narrativeKpiConsistency');
const { assessSummaryOperationalCoherence } = require('./summaryOperationalCoherence');

function assessSummaryCockpitIntegrity(summaryPayload = {}, ctx = {}) {
  const cockpit = assessSummaryCockpitConsistency(summaryPayload, ctx);
  const dashboard = assessNarrativeDashboardAlignment(summaryPayload, ctx);
  const kpi = assessNarrativeKpiConsistency(summaryPayload, ctx);
  const coherence = assessSummaryOperationalCoherence({ cockpit, kpi, dashboard });

  return {
    phase: 'Z.9',
    cockpit,
    dashboard,
    kpi,
    coherence,
    cockpit_consistent: coherence.coherent && cockpit.cockpit_aligned
  };
}

module.exports = { assessSummaryCockpitIntegrity };
