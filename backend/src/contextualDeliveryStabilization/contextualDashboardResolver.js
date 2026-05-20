'use strict';

function resolveContextualDashboard(user, ctx = {}) {
  const band = ctx.hierarchy_band || 'operator';
  const domain = ctx.domain || 'general';
  const layout = band === 'executive' ? 'executive_grid' : band === 'director' ? 'director_grid' : 'operational_grid';
  return {
    dashboard_profile: `${domain}_${band}`,
    layout_hint: layout,
    widgets_scope: domain,
    corporate_aggregate: ['executive', 'director'].includes(band)
  };
}

module.exports = { resolveContextualDashboard };
