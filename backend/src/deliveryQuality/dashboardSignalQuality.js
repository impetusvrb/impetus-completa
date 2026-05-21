'use strict';

function assessDashboardSignalQuality(dashboardPayload = {}, ctx = {}) {
  const kpis = dashboardPayload?.kpis || dashboardPayload?.kpi_cards || [];
  const sections = dashboardPayload?.sections || [];
  const kpiCount = Array.isArray(kpis) ? kpis.length : 0;
  const sectionCount = Array.isArray(sections) ? sections.length : 0;
  const empty = kpiCount === 0 && sectionCount === 0;
  const generic = kpiCount > 0 && kpiCount <= 2 && !sections.length;

  const score = empty ? 0.25 : generic ? 0.55 : Math.min(1, 0.6 + kpiCount * 0.05 + sectionCount * 0.08);

  return {
    signal_quality: Number(score.toFixed(4)),
    empty_dashboard: empty,
    generic_dashboard: generic,
    recommendation_only: true
  };
}

module.exports = { assessDashboardSignalQuality };
