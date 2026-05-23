'use strict';

const flagsZ23 = require('../../config/phaseZ23FeatureFlags');

function applyDensityGovernor(centers = [], widgets = [], opts = {}) {
  const maxCenters = opts.max_centers ?? flagsZ23.maxCenters();
  const maxMetrics = opts.max_metrics_per_center ?? flagsZ23.maxMetricsPerCenter();
  const maxWidgets = opts.max_widgets ?? 8;

  let cappedCenters = centers.slice(0, maxCenters).map((c) => {
    const metrics = c.metrics || {};
    const keys = Object.keys(metrics).slice(0, maxMetrics);
    const trimmed = {};
    for (const k of keys) trimmed[k] = metrics[k];
    return { ...c, metrics: trimmed, density_capped: Object.keys(metrics).length > maxMetrics };
  });

  let cappedWidgets = widgets.slice(0, maxWidgets);
  const totalMetrics = cappedCenters.reduce((n, c) => n + Object.keys(c.metrics || {}).length, 0);
  const overload = totalMetrics > maxCenters * maxMetrics || widgets.length > maxWidgets;

  return {
    centers: cappedCenters,
    widgets: cappedWidgets,
    density: {
      center_count: cappedCenters.length,
      widget_count: cappedWidgets.length,
      total_metrics: totalMetrics,
      overload_detected: overload,
      capped: overload
    }
  };
}

module.exports = { applyDensityGovernor };
