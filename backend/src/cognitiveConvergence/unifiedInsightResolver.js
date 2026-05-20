'use strict';

const { getAuthoritativeTruth } = require('./contextualTruthAuthority');

function resolveInsightTruth(insights, user, ctx = {}) {
  const truth = getAuthoritativeTruth(user, { ...ctx, channel: 'insight' });
  const axis = truth?.contextual_truth?.functional_axis;
  const list = Array.isArray(insights) ? insights : insights?.items || [];

  return {
    insights: list.map((i) => ({ ...i, _truth_axis: axis, _truth_authority: 'unified_insight_resolver' })),
    insight_truth: { axis, count: list.length },
    consistent: list.every((i) => !i.domain || i.domain === axis || i.domain === 'shared')
  };
}

module.exports = { resolveInsightTruth };
