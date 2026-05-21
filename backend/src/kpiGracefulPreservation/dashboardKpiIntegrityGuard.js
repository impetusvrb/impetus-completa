'use strict';

function guardDashboardKpiIntegrity(kpis = []) {
  const count = Array.isArray(kpis) ? kpis.length : 0;
  return {
    dashboard_empty: count === 0,
    frontend_safe: count > 0,
    kpi_count: count
  };
}

module.exports = { guardDashboardKpiIntegrity };
