'use strict';

function protectCockpitVisibility(kpis = [], ctx = {}) {
  const empty = !kpis.length;
  return { cockpit_operational: !empty, cockpit_preserved: !empty || ctx.emergency_minimum_applied === true, frontend_safe: !empty };
}

module.exports = { protectCockpitVisibility };
