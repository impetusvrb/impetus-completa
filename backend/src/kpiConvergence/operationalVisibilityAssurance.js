'use strict';

const { detectOperationalBlindness } = require('../kpiUnderdeliveryHardening/operationalBlindnessDetector');

function assureOperationalVisibility(kpis = [], ctx = {}) {
  const tier = String(ctx.hierarchy_tier || '').toLowerCase();
  if (tier !== 'operational') return { assured: true, tier, not_applicable: true };
  const blindness = detectOperationalBlindness(kpis, ctx);
  return {
    assured: !blindness.operational_blindness_critical,
    blindness,
    too_executive: ctx.alignment?.skew === 'too_executive_for_operator'
  };
}

module.exports = { assureOperationalVisibility };
