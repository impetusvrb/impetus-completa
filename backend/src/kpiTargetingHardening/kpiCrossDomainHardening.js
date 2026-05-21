'use strict';

const { validateKpiCrossDomain } = require('../kpiSafety/kpiCrossDomainValidator');
const { isolateDomainKpis } = require('../kpiRuntimeEnforcement/domainKpiIsolation');

function hardenKpiCrossDomain(user, kpis = [], ctx = {}) {
  const validation = validateKpiCrossDomain(user, kpis, ctx);
  const isolation = isolateDomainKpis(kpis, ctx);
  return {
    valid: validation.valid && isolation.removed.length === 0,
    residual_leakage: isolation.removed,
    domain_isolation_score: validation.domain_isolation_score
  };
}

module.exports = { hardenKpiCrossDomain };
