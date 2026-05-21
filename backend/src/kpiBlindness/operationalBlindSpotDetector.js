'use strict';

const { detectOperationalBlindness } = require('../kpiUnderdeliveryHardening/operationalBlindnessDetector');

function detectOperationalBlindSpot(kpis = [], ctx = {}) {
  const b = detectOperationalBlindness(kpis, ctx);
  return { blind_spot: b.operational_blindness, critical: b.operational_blindness_critical, tier: 'operational' };
}

module.exports = { detectOperationalBlindSpot };
