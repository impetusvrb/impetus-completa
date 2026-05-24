'use strict';

const { verifyMemoryIntegrity } = require('./zMemoryIntegrityRuntime');
const { recoverContextOnFailure } = require('./zContextRecoveryRuntime');

function applyCognitiveFallback(tenantId, error) {
  const integrity = verifyMemoryIntegrity(tenantId);
  const recovered = recoverContextOnFailure(error?.message || 'sz2_runtime_error');
  return {
    integrity,
    recovered,
    safe: true,
    human_authority_preserved: true,
    assistive_only: true
  };
}

module.exports = { applyCognitiveFallback };
