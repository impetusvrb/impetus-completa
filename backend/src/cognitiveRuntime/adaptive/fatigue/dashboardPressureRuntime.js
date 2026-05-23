'use strict';

function measureDashboardPressure(payload = {}) {
  const domains = _activeDomains(payload);
  return {
    dashboard_pressure: domains.length * 0.12,
    domain_count: domains.length,
    saturation: domains.length > 4
  };
}

function _activeDomains(payload) {
  const d = [];
  if (payload.specialized_cognitive_runtime?.consolidation_applied) d.push('quality');
  if (payload.sst_cognitive_runtime?.consolidation_applied) d.push('safety');
  if (payload.hr_cognitive_runtime?.consolidation_applied) d.push('hr');
  if (payload.production_cognitive_runtime?.consolidation_applied) d.push('production');
  if (payload.environmental_cognitive_runtime?.consolidation_applied) d.push('environmental');
  if (payload.executive_cognitive_runtime?.consolidation_applied) d.push('executive');
  return d;
}

module.exports = { measureDashboardPressure };
