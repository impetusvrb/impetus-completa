'use strict';

function planContextualGracefulDegradation(ctx = {}) {
  const widgets = ctx.widgets || [];
  const degraded = widgets.length > 12 ? widgets.slice(0, 10) : widgets;

  return {
    widgets_before: widgets.length,
    widgets_after_simulation: degraded.length,
    dashboards_reduced: ctx.generic_dashboard ? 1 : 0,
    degradation_applied: false,
    simulation_only: true
  };
}

module.exports = { planContextualGracefulDegradation };
