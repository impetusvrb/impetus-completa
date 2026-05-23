'use strict';

const flagsZP0 = require('../../../config/phaseZP0FeatureFlags');

function protectCockpitOverload(payload = {}) {
  const centers = payload.centers || [];
  const widgets = payload.widgets || [];
  const overload =
    centers.length > flagsZP0.maxCenters() + 2 || widgets.length > 10;
  return {
    overload_detected: overload,
    trimmed: overload,
    limits: { max_centers: flagsZP0.maxCenters(), max_widgets: 8, max_charts: 3 }
  };
}

module.exports = { protectCockpitOverload };
