'use strict';

function stabilizeInsights(insights, user, ctx = {}) {
  const axis = ctx.domain || ctx.functional_axis;
  const list = Array.isArray(insights) ? insights : insights?.items || [];
  const stabilized = list.filter((i) => !i.domain || i.domain === axis || i.domain === 'shared');
  return {
    insights: list,
    stabilized_count: stabilized.length,
    insight_targeting_precision: list.length ? stabilized.length / list.length : 1,
    authority_trace: 'contextual_insight_stabilizer',
    runtime_truth_reference: ctx.runtime_truth_axis || axis
  };
}

module.exports = { stabilizeInsights };
