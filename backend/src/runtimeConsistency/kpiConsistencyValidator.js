'use strict';

function validateKpiConsistency(kpiCtx = {}, sync = {}) {
  const axis = kpiCtx.functional_axis || kpiCtx.domain || kpiCtx.runtime_truth_reference;
  const match = !axis || !sync.canonical_axis || String(axis).toLowerCase() === sync.canonical_axis;
  const priority = kpiCtx.priority || kpiCtx.risk_level;
  return {
    channel: 'kpi',
    consistent: match,
    axis,
    priority,
    issues: match ? [] : [{ type: 'kpi_axis_mismatch' }]
  };
}

module.exports = { validateKpiConsistency };
