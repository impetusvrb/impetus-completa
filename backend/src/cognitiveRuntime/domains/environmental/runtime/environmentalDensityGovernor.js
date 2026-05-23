'use strict';

const flags = require('../../../config/phaseP1EnvironmentalFeatureFlags');
const shared = require('../../../cockpitConsolidation/runtime/cockpitDensityGovernor');
const { reduceComplianceNoise } = require('./complianceNoiseReducer');

function applyEnvironmentalDensityGovernor(centers = [], widgets = [], opts = {}) {
  if (!flags.isEnvironmentalDensityGovernorEnabled()) {
    return { centers, widgets, density: { capped: false } };
  }
  const reduced = reduceComplianceNoise(centers);
  return shared.applyDensityGovernor(reduced, widgets, {
    max_centers: opts.max_centers ?? flags.maxCenters(),
    max_widgets: opts.max_widgets ?? 8
  });
}

module.exports = { applyEnvironmentalDensityGovernor };
