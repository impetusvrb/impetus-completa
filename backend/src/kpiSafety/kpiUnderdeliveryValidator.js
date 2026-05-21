'use strict';

const { analyzeKpiUnderdeliveryRisk } = require('../kpiEnforcementPreparation/kpiUnderdeliveryRiskAnalyzer');
const { TIER_MIN } = require('../kpiGracefulPreservation/minimumOperationalKpiSet');

function validateKpiUnderdelivery(kpis = [], ctx = {}) {
  const tier = String(ctx.hierarchy_tier || 'coordination').toLowerCase();
  const risk = analyzeKpiUnderdeliveryRisk(kpis, {
    ...ctx,
    simulated_visible_count: kpis.length
  });
  const critical_blocked = risk.critical && kpis.length < (TIER_MIN[tier] ?? 3);
  return {
    ...risk,
    critical_blocked,
    minimum_tier: TIER_MIN[tier] ?? 3
  };
}

module.exports = { validateKpiUnderdelivery };
