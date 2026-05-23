'use strict';

const flagsZ25 = require('../../../config/phaseZ25FeatureFlags');
const shared = require('../../../cockpitConsolidation/runtime/cockpitDensityGovernor');

function applySafetyDensityGovernor(centers = [], widgets = [], opts = {}) {
  if (!flagsZ25.isSafetyDensityGovernorEnabled()) {
    return { centers, widgets, density: { capped: false } };
  }
  return shared.applyDensityGovernor(centers, widgets, {
    max_centers: opts.max_centers ?? flagsZ25.maxCenters(),
    max_widgets: opts.max_widgets ?? 8
  });
}

module.exports = { applySafetyDensityGovernor };
