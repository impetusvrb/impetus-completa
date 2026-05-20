'use strict';

const { logPhaseL } = require('./phaseLLogger');
const phaseL = require('./config/phaseLFeatureFlags');

function guardToolPrecision(toolId, user, ctx = {}) {
  const { resolveToolExposure } = require('./preciseToolExposureResolver');
  const r = resolveToolExposure([toolId], user, ctx);
  const tool = r.tools[0];
  if (phaseL.isRuntimePrecisionObservabilityEnabled() && !tool?.eligible) {
    logPhaseL('TOOL_EXPOSURE_DENIED', { tool_id: toolId, reason: tool?.reason });
  }
  return tool || { tool_id: toolId, eligible: false, reason: 'unknown_tool' };
}

module.exports = { guardToolPrecision };
