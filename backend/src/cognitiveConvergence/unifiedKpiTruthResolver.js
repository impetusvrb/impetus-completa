'use strict';

const { getAuthoritativeTruth } = require('./contextualTruthAuthority');

function resolveKpiTruth(kpis, user, ctx = {}) {
  const truth = getAuthoritativeTruth(user, { ...ctx, channel: 'kpi' });
  const axis = truth?.contextual_truth?.functional_axis;
  const items = Array.isArray(kpis) ? kpis : kpis?.kpis || [];
  const aligned = items.map((k) => ({
    ...k,
    _truth_axis: axis,
    _truth_authority: 'unified_kpi_truth_resolver'
  }));

  let mismatch = 0;
  for (const k of items) {
    if (k.domain && axis && k.domain !== axis && k.domain !== 'shared') mismatch++;
  }

  return {
    kpis: aligned,
    kpi_truth: { axis, item_count: items.length, mismatch_count: mismatch },
    summary_consistency_key: `kpi:${axis}:${items.length}`,
    consistent: mismatch === 0
  };
}

module.exports = { resolveKpiTruth };
