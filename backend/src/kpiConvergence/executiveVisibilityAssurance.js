'use strict';

const { detectExecutiveBlindness } = require('../kpiUnderdeliveryHardening/executiveBlindnessDetector');
const { assessStrategicVisibilityMinimums } = require('../kpiOperationalMinimums/strategicVisibilityMinimums');

function assureExecutiveVisibility(kpis = [], ctx = {}) {
  const tier = String(ctx.hierarchy_tier || '').toLowerCase();
  if (!['executive', 'director'].includes(tier)) {
    return { assured: true, tier, not_applicable: true };
  }
  const blindness = detectExecutiveBlindness(kpis, ctx);
  const strategic = assessStrategicVisibilityMinimums(kpis, ctx);
  return {
    assured: !blindness.executive_blindness_critical && strategic.strategic_minimum_met,
    strategic,
    blindness,
    too_operational: ctx.alignment?.skew === 'too_operational_for_executive'
  };
}

module.exports = { assureExecutiveVisibility };
