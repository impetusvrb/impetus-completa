'use strict';

const { validateKpiUnderdelivery } = require('../kpiSafety/kpiUnderdeliveryValidator');
const { TIER_MIN } = require('../kpiGracefulPreservation/minimumOperationalKpiSet');

function detectCriticalKpiUnderdelivery(kpis = [], ctx = {}) {
  const u = validateKpiUnderdelivery(kpis, ctx);
  const tier = String(ctx.hierarchy_tier || 'coordination').toLowerCase();
  const min = TIER_MIN[tier] ?? 3;
  const critical = kpis.length < Math.max(1, min - 1) || u.critical === true;
  return { ...u, critical, dangerously_empty: kpis.length === 0 };
}

module.exports = { detectCriticalKpiUnderdelivery };
