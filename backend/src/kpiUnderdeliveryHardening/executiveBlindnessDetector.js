'use strict';

const { inferKpiDomain } = require('../kpiRollout/kpiDomainRegistry');

function detectExecutiveBlindness(kpis = [], ctx = {}) {
  const tier = String(ctx.hierarchy_tier || '').toLowerCase();
  if (!['executive', 'director'].includes(tier)) return { executive_blindness: false };
  const hasStrategic = kpis.some((k) => {
    const d = inferKpiDomain(k);
    return d === 'executive' || d === 'financial' || k.strategic === true;
  });
  return { executive_blindness: !hasStrategic, executive_blindness_critical: !hasStrategic && kpis.length < 2 };
}

module.exports = { detectExecutiveBlindness };
