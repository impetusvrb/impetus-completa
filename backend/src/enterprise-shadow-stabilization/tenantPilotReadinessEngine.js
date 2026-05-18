'use strict';

const readiness = require('./operationalReadinessScoring');

function evaluateTenantPilotReadiness(tenantId, pack) {
  const op = readiness.scoreOperationalReadiness({
    flow_stability: pack.flow_stability,
    friction: pack.friction,
    publication: pack.multi_domain_publication,
    cognitive: pack.cognitive_maturity
  });

  let status = 'remain_in_shadow';
  if (op.band === 'pilot_ready' && pack.multi_domain_publication?.publication_stable) {
    status = 'pilot_ready';
  }
  if (op.band === 'controlled_ready' && op.score >= 75 && !(pack.friction?.issues?.length)) {
    status = 'controlled_ready';
  }
  if (!pack.multi_domain_publication?.publication_stable || op.score < 40) {
    status = 'remain_in_shadow';
  }

  return {
    ok: true,
    tenant_id: tenantId,
    status,
    operational_score: op.score,
    auto_promotion: false,
    manual_only: true,
    domains: ['quality', 'safety', 'logistics']
  };
}

module.exports = { evaluateTenantPilotReadiness };
