'use strict';

const { getAuthoritativeTruth } = require('./contextualTruthAuthority');

function resolveSummaryTruth(summary, user, ctx = {}) {
  const truth = getAuthoritativeTruth(user, { ...ctx, channel: 'summary' });
  const axis = truth?.contextual_truth?.functional_axis;
  const text = summary?.summary || summary?.text || '';
  const provenance = summary?.provenance || summary?.sources || null;

  return {
    summary: {
      ...summary,
      _truth_axis: axis,
      _truth_authority: 'unified_summary_truth_resolver'
    },
    summary_truth: {
      axis,
      has_provenance: Boolean(provenance),
      length: String(text).length
    },
    consistent: Boolean(provenance) || !summary?.synthetic,
    summary_consistency_rate: provenance ? 1 : summary?.synthetic ? 0.4 : 0.85
  };
}

module.exports = { resolveSummaryTruth };
