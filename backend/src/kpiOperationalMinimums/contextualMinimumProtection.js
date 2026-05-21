'use strict';

const { guaranteeOperationalVisibility } = require('./operationalVisibilityGuarantee');
const { assessStrategicVisibilityMinimums } = require('./strategicVisibilityMinimums');

function applyContextualMinimumProtection(kpis = [], original = [], ctx = {}) {
  const guaranteed = guaranteeOperationalVisibility(kpis, original, ctx);
  const strategic = assessStrategicVisibilityMinimums(guaranteed.kpis, ctx);
  return {
    kpis: guaranteed.kpis,
    restored: guaranteed.restored || [],
    strategic,
    minimum_met: guaranteed.minimum_met !== false && strategic.strategic_minimum_met !== false,
    fabricated: false
  };
}

module.exports = { applyContextualMinimumProtection };
