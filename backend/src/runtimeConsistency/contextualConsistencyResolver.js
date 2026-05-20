'use strict';

function resolveContextualConsistency(channelPayloads = {}) {
  const axes = [];
  const severities = [];

  for (const [channel, payload] of Object.entries(channelPayloads)) {
    if (!payload) continue;
    const axis = payload.axis || payload.functional_axis || payload._truth_axis || payload.domain;
    if (axis) axes.push(String(axis).toLowerCase());
    const sev = payload.severity || payload.risk_level || payload.priority;
    if (sev) severities.push(String(sev).toLowerCase());
  }

  const uniqueAxes = [...new Set(axes)];
  const uniqueSev = [...new Set(severities)];

  return {
    axis_aligned: uniqueAxes.length <= 1,
    axes: uniqueAxes,
    severity_aligned: uniqueSev.length <= 1,
    severities: uniqueSev,
    contextual_synchronization: uniqueAxes.length <= 1 ? 0.92 : Math.max(0.4, 1 - uniqueAxes.length * 0.2)
  };
}

module.exports = { resolveContextualConsistency };
