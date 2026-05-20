'use strict';

const { FORBIDDEN_CROSS_DOMAIN, normalizeAxis, inferKpiDomain } = require('./kpiDomainRegistry');
const { extractKpiList } = require('./kpiTargetingValidator');

function validateDomainKpis(user, kpiPayload, ctx = {}) {
  const userAxis = normalizeAxis(ctx.functional_axis || user?.functional_axis || user?.functional_area);
  const kpis = extractKpiList(kpiPayload);
  const issues = [];
  const forbiddenForUser = FORBIDDEN_CROSS_DOMAIN[userAxis] || [];

  for (const k of kpis) {
    const kDomain = inferKpiDomain(k);
    if (forbiddenForUser.includes(kDomain)) {
      issues.push({
        type: 'cross_domain_exposure',
        kpi_id: k.id || k.key,
        kpi_domain: kDomain,
        user_axis: userAxis,
        severity: 'critical'
      });
    }
    if (kDomain !== userAxis && kDomain !== 'general' && kDomain !== 'shared') {
      const reverseForbidden = FORBIDDEN_CROSS_DOMAIN[kDomain] || [];
      if (reverseForbidden.includes(userAxis)) {
        issues.push({
          type: 'domain_overlap',
          kpi_id: k.id || k.key,
          kpi_domain: kDomain,
          severity: 'high'
        });
      }
    }
  }

  const isolated = kpis.length - issues.filter((i) => i.severity === 'critical').length;
  return {
    valid: issues.filter((i) => i.severity === 'critical').length === 0,
    user_axis: userAxis,
    domain_isolation_score: kpis.length ? Number((isolated / kpis.length).toFixed(4)) : 1,
    issues
  };
}

module.exports = { validateDomainKpis };
