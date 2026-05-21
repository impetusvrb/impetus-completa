'use strict';

function assessContextualVisibilityDeficit(kpis = [], ctx = {}) {
  const expected = ctx.expected_minimum ?? 3;
  const deficit = Math.max(0, expected - kpis.length);
  return {
    visibility_deficit: deficit > 0,
    deficit_count: deficit,
    severity: deficit >= 2 ? 'critical' : deficit > 0 ? 'medium' : 'low'
  };
}

module.exports = { assessContextualVisibilityDeficit };
