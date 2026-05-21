'use strict';

const STRATEGIC_MIN = 2;

function assessStrategicVisibilityMinimums(kpis = [], ctx = {}) {
  const tier = String(ctx.hierarchy_tier || '').toLowerCase();
  if (!['executive', 'director'].includes(tier)) {
    return { strategic_minimum_met: true, required: 0 };
  }
  return {
    strategic_minimum_met: kpis.length >= STRATEGIC_MIN,
    required: STRATEGIC_MIN,
    count: kpis.length
  };
}

module.exports = { assessStrategicVisibilityMinimums, STRATEGIC_MIN };
