'use strict';

const { validateDomainKpis } = require('../kpiRollout/domainKpiValidator');

function validateKpiCrossDomain(user, kpis = [], ctx = {}) {
  const r = validateDomainKpis(user, kpis, ctx);
  return {
    valid: r.valid,
    user_axis: r.user_axis,
    cross_domain_issues: (r.issues || []).filter((i) => i.type === 'cross_domain_exposure'),
    domain_isolation_score: r.domain_isolation_score
  };
}

module.exports = { validateKpiCrossDomain };
