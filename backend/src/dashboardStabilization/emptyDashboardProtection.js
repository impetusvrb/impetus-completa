'use strict';

function protectEmptyDashboard(payload = {}) {
  const hasContent =
    (payload.kpis && payload.kpis.length > 0) ||
    (payload.sections && payload.sections.length > 0) ||
    (payload.widgets && payload.widgets.length > 0);

  return {
    empty: !hasContent,
    protected: !hasContent,
    survival_kpis: hasContent ? [] : [{ key: 'operational_status', title: 'Status operacional' }],
    applied: false,
    frontend_safe: true
  };
}

module.exports = { protectEmptyDashboard };
