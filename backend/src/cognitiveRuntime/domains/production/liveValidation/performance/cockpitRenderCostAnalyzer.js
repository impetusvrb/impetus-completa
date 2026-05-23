'use strict';

function analyzeCockpitRenderCost(consolidated = {}) {
  const widgets = consolidated.widgets?.length ?? 0;
  const centers = consolidated.centers?.length ?? 0;
  const cost = widgets * 3 + centers * 5;
  return { render_cost_units: cost, acceptable: cost <= 80 };
}

module.exports = { analyzeCockpitRenderCost };
