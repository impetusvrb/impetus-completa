'use strict';

const { isExecutiveKpi } = require('../terminalGovernance/finalKpiAuthority');

const EXECUTIVE_LEAKAGE_PATTERN =
  /faturamento|lucro|esg estrat[eé]gico|oee executivo|margem|ebitda|score corporativo/i;

const NON_EXECUTIVE_TIERS = new Set(['coordination', 'operational', 'supervision']);

function validateKpiGovernance(kpis = [], ctx = {}) {
  const tier = ctx.hierarchy_tier || ctx.canonical_identity?.hierarchy_tier || 'coordination';
  const domain = ctx.domain_axis || ctx.canonical_identity?.domain_axis || 'quality';
  const leakage = [];
  const kept = [];

  for (const k of kpis) {
    const label = String(k.label || k.id || k.kpi_id || '');
    const key = label.toLowerCase();
    let reason = null;

    if (NON_EXECUTIVE_TIERS.has(tier) && (isExecutiveKpi(k) || EXECUTIVE_LEAKAGE_PATTERN.test(key))) {
      reason = 'executive_kpi_on_operational_tier';
    } else if (k.domain && k.domain !== domain && domain !== 'unknown' && k.domain === 'executive') {
      reason = 'cross_domain_executive_kpi';
    }

    if (reason) leakage.push({ kpi_id: key || label, reason, domain: k.domain });
    else kept.push(k);
  }

  const convergenceOk = leakage.length === 0;
  const underdeliveryRecovery = kept.length === 0 && (ctx.original_kpis || []).length > 0;

  return {
    kpi_leakage_detected: !convergenceOk,
    leakage_items: leakage,
    kpi_count: kept.length,
    hierarchy_valid: convergenceOk,
    domain_valid: leakage.every((l) => l.reason !== 'cross_domain_executive_kpi') || convergenceOk,
    authority_valid: convergenceOk,
    convergence_valid: convergenceOk,
    underdelivery_recovery_attempted: underdeliveryRecovery,
    executive_patterns_blocked: EXECUTIVE_LEAKAGE_PATTERN.source
  };
}

module.exports = { validateKpiGovernance, EXECUTIVE_LEAKAGE_PATTERN };
