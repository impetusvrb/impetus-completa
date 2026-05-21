'use strict';

const { inferKpiDomain } = require('../kpiRollout/kpiDomainRegistry');

function detectOperationalBlindness(kpis = [], ctx = {}) {
  const tier = String(ctx.hierarchy_tier || '').toLowerCase();
  if (tier !== 'operational') return { operational_blindness: false };
  const hasOp = kpis.some((k) => {
    const d = inferKpiDomain(k);
    return d === 'operations' || d === 'general' || k.operational === true;
  });
  return { operational_blindness: !hasOp && kpis.length > 0, operational_blindness_critical: !hasOp && kpis.length < 2 };
}

module.exports = { detectOperationalBlindness };
