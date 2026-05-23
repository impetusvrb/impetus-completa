'use strict';

const flagsZP0 = require('../../../config/phaseZP0FeatureFlags');
const shared = require('../../../cockpitConsolidation/runtime/cockpitDensityGovernor');
const { prioritizeOperationalSignals } = require('./operationalSignalPrioritizer');

function applyProductionDensityGovernor(centers = [], widgets = [], opts = {}) {
  if (!flagsZP0.isProductionDensityGovernorEnabled()) {
    return { centers, widgets, density: { capped: false } };
  }
  const prioritized = prioritizeOperationalSignals(centers);
  const out = shared.applyDensityGovernor(prioritized, widgets, {
    max_centers: opts.max_centers ?? flagsZP0.maxCenters(),
    max_widgets: opts.max_widgets ?? 8,
    max_metrics_per_center: opts.max_metrics_per_center ?? 8,
    max_critical_charts: 3
  });
  return {
    ...out,
    density: {
      ...out.density,
      telemetry_load_balanced: true,
      overload_protection: out.centers.length <= flagsZP0.maxCenters()
    }
  };
}

module.exports = { applyProductionDensityGovernor };
