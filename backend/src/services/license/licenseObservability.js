'use strict';

/**
 * Métricas e logs estruturados de licenciamento (CERT-LICENSE-01).
 */

const metrics = {
  validations_total: 0,
  validations_ok: 0,
  validations_failed: 0,
  grace_active: 0,
  last_state: 'unknown',
  last_validated_at: null,
  last_capabilities_count: 0,
};

function logLicenseEvent(event, payload = {}) {
  try {
    console.info(
      '[LICENSE]',
      JSON.stringify({
        event,
        at: new Date().toISOString(),
        ...payload,
      })
    );
  } catch {
    /* ignore */
  }
}

/**
 * @param {object} result
 */
function recordValidation(result) {
  metrics.validations_total += 1;
  metrics.last_validated_at = new Date().toISOString();
  metrics.last_state = result.state || (result.valid ? 'valid' : 'invalid');
  if (result.operational || result.valid) metrics.validations_ok += 1;
  else metrics.validations_failed += 1;
  if (result.state === 'grace') metrics.grace_active += 1;
  metrics.last_capabilities_count = Array.isArray(result.capabilities)
    ? result.capabilities.length
    : result.capabilitiesSet?.size || 0;

  if (result.state === 'grace') {
    logLicenseEvent('LICENSE_GRACE', {
      expires_at: result.expiresAt,
      grace_ends_at: result.graceEndsAt,
    });
  } else if (!result.operational && result.reason !== 'validation_disabled') {
    logLicenseEvent('LICENSE_VALIDATION_FAILED', {
      reason: result.reason,
      state: result.state,
    });
  } else if (result.valid || result.operational) {
    logLicenseEvent('LICENSE_VALID', { state: result.state, plan: result.plan });
  }
}

function getMetricsSnapshot() {
  return { ...metrics };
}

module.exports = {
  logLicenseEvent,
  recordValidation,
  getMetricsSnapshot,
};
