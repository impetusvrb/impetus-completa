'use strict';

const phaseU = require('./config/phaseUFeatureFlags');
const { superviseHierarchyIntegrity } = require('./hierarchyIntegritySupervisor');
const { resolveOperationalHierarchy } = require('./operationalHierarchyResolver');
const { extractKpiList } = require('../kpiRollout/kpiTargetingValidator');
const { inferKpiDomain } = require('../kpiRollout/kpiDomainRegistry');

const BAND_DOMAIN_RULES = {
  operator: { forbid: ['executive', 'financial'], message: 'operador ≠ governança executiva/financeira' },
  supervisor: { forbid: ['executive'], message: 'supervisão ≠ diretoria' },
  executive: { forbid: ['operator'], message: 'executivos ≠ painel operacional puro' }
};

function stabilizeHierarchyDelivery(user, kpiPayload, ctx = {}) {
  const integrity = superviseHierarchyIntegrity(user, kpiPayload, ctx);
  const ops = resolveOperationalHierarchy(user, ctx);
  const kpis = extractKpiList(kpiPayload);
  const stabilization_actions = [];
  const recommendations = [];

  const rules = BAND_DOMAIN_RULES[ops.hierarchy_band];
  if (rules) {
    for (const k of kpis) {
      const d = inferKpiDomain(k);
      if (rules.forbid.includes(d)) {
        stabilization_actions.push({
          kpi_id: k.id || k.key,
          type: 'hierarchy_domain_violation',
          band: ops.hierarchy_band,
          domain: d,
          action: 'recommend_hide_or_retarget',
          auto_apply: false
        });
        recommendations.push(`${rules.message}: KPI ${k.id || k.key}`);
      }
    }
  }

  const stable = integrity.valid && stabilization_actions.length === 0;

  return {
    stable,
    hierarchy_delivery_integrity: integrity.hierarchy_integrity_score,
    operational_hierarchy: ops,
    integrity,
    stabilization_actions,
    recommendations,
    enforcement_active: phaseU.isKpiHierarchyStabilizationEnabled(),
    auto_correct: false
  };
}

module.exports = { stabilizeHierarchyDelivery };
