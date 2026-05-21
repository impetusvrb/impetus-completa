'use strict';

const { validateKpiCrossDomain } = require('../kpiSafety/kpiCrossDomainValidator');

function measureKpiContextualAgreement(user, kpis = [], ctx = {}) {
  const cross = validateKpiCrossDomain(user, kpis, ctx);
  const axis = cross.user_axis || ctx.domain_axis;
  const agreement = cross.domain_isolation_score ?? (cross.valid ? 1 : 0.5);
  return {
    agreement_score: Number(agreement.toFixed(4)),
    coherent: cross.valid,
    user_axis: axis,
    cross_domain_issues: cross.cross_domain_issues || []
  };
}

module.exports = { measureKpiContextualAgreement };
