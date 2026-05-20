'use strict';

const phaseL = require('./config/phaseLFeatureFlags');
const { resolveToolExposure } = require('./preciseToolExposureResolver');

function computeToolVisibility(tools, user, ctx = {}) {
  const exposure = resolveToolExposure(tools, user, ctx);
  const enforcement = phaseL.isPreciseToolExposureEnabled();
  return {
    visible_tools: enforcement ? exposure.eligible_tools : (tools || exposure.eligible_tools),
    precise_tools: exposure.eligible_tools,
    enforcement_active: enforcement,
    shadow_only: !enforcement,
    ...exposure
  };
}

module.exports = { computeToolVisibility };
