'use strict';

function assessTenantGovernanceConfidence(maturityPack = {}, ctx = {}) {
  const maturity = maturityPack.maturity_score ?? 0.5;
  const reliability = maturityPack.reliability?.reliability_score ?? 0.5;
  const confidence = (maturity + reliability) / 2;

  return {
    confidence_score: confidence,
    governance_confident: confidence >= 0.55,
    recommendation_only: true,
    auto_execute: false,
    tenant_id: ctx.tenant_id
  };
}

module.exports = { assessTenantGovernanceConfidence };
