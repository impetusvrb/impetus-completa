'use strict';

function assessTenantOperationalReliability(pack = {}, ctx = {}) {
  const stability = pack.stability || {};
  const sustainability = pack.sustainability || {};
  const issues = (stability.issues || []).length;
  const score = Math.max(0, 1 - issues * 0.15);

  return {
    reliability_score: score,
    reliable: score >= 0.6 && stability.unstable !== true,
    graceful_degradation: true,
    tenant_id: ctx.tenant_id
  };
}

module.exports = { assessTenantOperationalReliability };
