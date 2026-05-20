'use strict';

function validateKpiDependencies(kpiPayload, ctx = {}) {
  const kpis = kpiPayload?.kpis || kpiPayload?.items || (Array.isArray(kpiPayload) ? kpiPayload : []);
  const issues = [];
  for (const k of kpis) {
    const id = k.id || k.key || k.name;
    if (!k.source && !k.builder && !k.legacy) {
      issues.push({ kpi_id: id, issue: 'missing_source', severity: 'high' });
    }
    if (k.domain && ctx.domain && k.domain !== ctx.domain && k.domain !== 'shared') {
      issues.push({ kpi_id: id, issue: 'domain_mismatch', severity: 'critical' });
    }
    if (k.generic_fallback) {
      issues.push({ kpi_id: id, issue: 'generic_fallback_residual', severity: 'medium' });
    }
  }
  return {
    valid: issues.length === 0,
    issues,
    dependency_score: issues.length === 0 ? 1 : Math.max(0, 1 - issues.length * 0.15)
  };
}

module.exports = { validateKpiDependencies };
