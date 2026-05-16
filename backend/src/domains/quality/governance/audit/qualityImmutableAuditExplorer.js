'use strict';

const audit = require('../../audit/qualityImmutableAuditService');

/**
 * Explorador read-only sobre cadeia imutável existente (sem mutação).
 */
async function exploreImmutableChain(companyId, limit = 200) {
  return audit.verifyCompanyChain(companyId, limit);
}

module.exports = {
  exploreImmutableChain
};
