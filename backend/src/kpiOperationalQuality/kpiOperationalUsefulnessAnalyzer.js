'use strict';

const { inferKpiDomain } = require('../kpiRollout/kpiDomainRegistry');

function analyzeKpiOperationalUsefulness(kpis = [], ctx = {}) {
  const axis = String(ctx.domain_axis || '').toLowerCase();
  const aligned = kpis.filter((k) => {
    const d = inferKpiDomain(k);
    return d === axis || d === 'general' || d === 'operations' || d === 'shared';
  }).length;
  const score = kpis.length ? aligned / kpis.length : 0;
  return { usefulness_score: Number(score.toFixed(4)), operationally_useful: score >= 0.5 || kpis.length >= 2 };
}

module.exports = { analyzeKpiOperationalUsefulness };
