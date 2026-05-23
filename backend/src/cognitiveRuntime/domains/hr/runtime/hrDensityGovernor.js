'use strict';

const flagsZ26 = require('../../../config/phaseZ26FeatureFlags');
const shared = require('../../../cockpitConsolidation/runtime/cockpitDensityGovernor');

function applyHrDensityGovernor(centers = [], widgets = [], opts = {}) {
  if (!flagsZ26.isHrDensityGovernorEnabled()) {
    return { centers, widgets, density: { capped: false } };
  }
  return shared.applyDensityGovernor(centers, widgets, {
    max_centers: opts.max_centers ?? flagsZ26.maxCenters(),
    max_widgets: opts.max_widgets ?? 8
  });
}

module.exports = { applyHrDensityGovernor };
