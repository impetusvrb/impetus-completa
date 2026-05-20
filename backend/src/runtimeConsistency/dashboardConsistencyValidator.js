'use strict';

function validateDashboardConsistency(dashboardCtx = {}, sync = {}) {
  const axis = dashboardCtx.functional_axis || dashboardCtx.axis;
  const match = !axis || !sync.canonical_axis || String(axis).toLowerCase() === sync.canonical_axis;
  return {
    channel: 'dashboard',
    consistent: match,
    axis,
    canonical: sync.canonical_axis,
    issues: match ? [] : [{ type: 'axis_mismatch' }]
  };
}

module.exports = { validateDashboardConsistency };
