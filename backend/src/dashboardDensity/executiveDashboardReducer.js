'use strict';

function simulateExecutiveDashboardReduction(ctx = {}, analysis = {}) {
  const cap = 6;
  const widgets = typeof ctx.widgets === 'number' ? ctx.widgets : (ctx.widgets || []).length;
  const empty_risk = widgets < 2 && analysis.generic_dashboard;
  const would_reduce = widgets > cap;

  return {
    tier: 'executive',
    widgets_cap_simulation: cap,
    empty_cockpit_risk: empty_risk,
    would_reduce_widgets: would_reduce ? widgets - cap : 0,
    applied: false,
    simulation_only: true
  };
}

module.exports = { simulateExecutiveDashboardReduction };
