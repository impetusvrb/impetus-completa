'use strict';

const { extractKpiList } = require('../kpiRollout/kpiTargetingValidator');
const { inferKpiDomain, normalizeAxis } = require('../kpiRollout/kpiDomainRegistry');

function validateContextualKpiSemantics(user, kpiPayload, ctx = {}) {
  const kpis = extractKpiList(kpiPayload);
  const userAxis = normalizeAxis(ctx.functional_axis || user?.functional_axis);
  let aligned = 0;
  const issues = [];

  for (const k of kpis) {
    const domain = inferKpiDomain(k);
    const relevance = k.operational_relevance ?? (domain === userAxis || domain === 'general' ? 1 : 0.4);
    if (relevance < 0.5) {
      issues.push({ kpi_id: k.id || k.key, type: 'operational_irrelevance', severity: 'medium' });
    } else {
      aligned++;
    }
    if (k.semantic_drift) {
      issues.push({ kpi_id: k.id || k.key, type: 'semantic_drift', severity: 'high' });
    }
  }

  const score = kpis.length ? aligned / kpis.length : 1;
  return {
    valid: issues.filter((i) => i.severity === 'critical').length === 0,
    contextual_alignment_score: Number(score.toFixed(4)),
    issues
  };
}

module.exports = { validateContextualKpiSemantics };
