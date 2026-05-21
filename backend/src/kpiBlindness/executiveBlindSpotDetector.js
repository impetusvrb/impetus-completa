'use strict';

const { detectExecutiveBlindness } = require('../kpiUnderdeliveryHardening/executiveBlindnessDetector');

function detectExecutiveBlindSpot(kpis = [], ctx = {}) {
  const b = detectExecutiveBlindness(kpis, ctx);
  return {
    blind_spot: b.executive_blindness,
    critical: b.executive_blindness_critical,
    tier: 'executive'
  };
}

module.exports = { detectExecutiveBlindSpot };
