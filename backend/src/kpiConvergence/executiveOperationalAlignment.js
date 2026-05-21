'use strict';

const { inferKpiDomain } = require('../kpiRollout/kpiDomainRegistry');

function assessExecutiveOperationalAlignment(kpis = [], ctx = {}) {
  const tier = String(ctx.hierarchy_tier || '').toLowerCase();
  let execCount = 0;
  let opCount = 0;
  for (const k of kpis) {
    const d = inferKpiDomain(k);
    if (d === 'executive' || d === 'financial') execCount++;
    if (d === 'operations' || k.operational === true) opCount++;
  }
  const total = kpis.length || 1;
  const execRatio = execCount / total;
  const opRatio = opCount / total;

  let aligned = true;
  let skew = null;
  if (['executive', 'director'].includes(tier) && opRatio > 0.55) {
    aligned = false;
    skew = 'too_operational_for_executive';
  }
  if (tier === 'operational' && execRatio > 0.35) {
    aligned = false;
    skew = 'too_executive_for_operator';
  }
  if (tier === 'coordination' && execRatio > 0.5) {
    skew = 'executive_skew_coordination';
  }

  const balance = Math.max(0, 1 - Math.abs(execRatio - opRatio));
  return {
    aligned,
    skew,
    exec_ratio: Number(execRatio.toFixed(4)),
    op_ratio: Number(opRatio.toFixed(4)),
    balance_score: Number(balance.toFixed(4))
  };
}

module.exports = { assessExecutiveOperationalAlignment };
