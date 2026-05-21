'use strict';

function classifyTenantExpansion(maturityPack = {}, riskPack = {}) {
  const score = maturityPack.scaling_maturity_score ?? 0.5;
  const highRisk = riskPack.high_risk === true;

  if (highRisk) return { classification: 'high_risk', scalable: false, expansion_blocked: true };
  if (maturityPack.unstable) return { classification: 'unstable', scalable: false, expansion_blocked: true };
  if (score >= 0.65 && !highRisk) {
    return { classification: 'mature_scalable', scalable: true, expansion_blocked: false };
  }
  if (score >= 0.5) return { classification: 'scaling_candidate', scalable: false, expansion_blocked: false };
  return { classification: 'immature', scalable: false, expansion_blocked: true };
}

module.exports = { classifyTenantExpansion };
