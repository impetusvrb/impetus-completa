'use strict';

const flagsZ21 = require('../../config/phaseZ21FeatureFlags');

function resolveEnrichmentChannels(ctx = {}) {
  const channels = {
    kpis: flagsZ21.isKpiDomainAdapterEnabled() || ctx.enrich_kpis !== false,
    summary: flagsZ21.isSummaryEnrichmentEnabled() || ctx.enrich_summary === true,
    insights: true,
    cockpit_hints: true,
    contextual_questions: true,
    operational_metrics: true
  };
  return {
    channels,
    replace_render: false,
    replace_widgets: false,
    max_specialized_kpis: flagsZ21.maxSpecializedKpis()
  };
}

module.exports = { resolveEnrichmentChannels };
