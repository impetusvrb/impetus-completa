'use strict';

function simulateOperationalDashboardReduction(ctx = {}, analysis = {}) {
  const cap = ctx.hierarchy_level >= 4 ? 12 : 10;
  const widgets = typeof ctx.widgets === 'number' ? ctx.widgets : (ctx.widgets || []).length;
  const would_reduce = widgets > cap || analysis.operational_noise;

  return {
    tier: 'operational',
    widgets_cap_simulation: cap,
    would_reduce_widgets: would_reduce ? Math.max(0, widgets - cap) : 0,
    applied: false,
    simulation_only: true
  };
}

module.exports = { simulateOperationalDashboardReduction };
