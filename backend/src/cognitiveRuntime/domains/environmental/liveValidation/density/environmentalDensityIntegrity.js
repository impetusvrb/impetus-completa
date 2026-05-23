'use strict';

function validateEnvironmentalDensityIntegrity(consolidated = {}) {
  const centers = consolidated.centers?.length ?? 0;
  const widgets = consolidated.widgets?.filter((w) => !w.collapsed_generic)?.length ?? 0;
  const maxMetrics = Math.max(...(consolidated.centers || []).map((c) => Object.keys(c.metrics || {}).length), 0);
  return {
    density_safe: centers <= 6 && widgets <= 8 && maxMetrics <= 8,
    centers,
    widgets,
    max_metrics_per_center: maxMetrics
  };
}

module.exports = { validateEnvironmentalDensityIntegrity };
