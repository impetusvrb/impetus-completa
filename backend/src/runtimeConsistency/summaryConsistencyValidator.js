'use strict';

function validateSummaryConsistency(summaryCtx = {}, sync = {}, kpiCtx = {}) {
  const axis = summaryCtx.runtime_truth_reference || summaryCtx.functional_axis;
  const match = !axis || !sync.canonical_axis || String(axis).toLowerCase() === sync.canonical_axis;
  const kpiAxis = kpiCtx.functional_axis || kpiCtx.domain;
  const kpiMatch = !kpiAxis || !axis || String(kpiAxis).toLowerCase() === String(axis).toLowerCase();
  return {
    channel: 'summary',
    consistent: match && kpiMatch,
    axis,
    kpi_summary_aligned: kpiMatch,
    issues: [
      ...(match ? [] : [{ type: 'summary_axis_mismatch' }]),
      ...(kpiMatch ? [] : [{ type: 'kpi_summary_inconsistency' }])
    ]
  };
}

module.exports = { validateSummaryConsistency };
