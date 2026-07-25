'use strict';

/**
 * SEC-21A — Warning vs blocking classifier.
 */

const ACCEPTABLE_WARNINGS = Object.freeze([
  'SEC04_SKIP_GIT_CHECK',
  'FLAGS_OFF_PRODUCTION',
  'NC_BAIXA_OPEN',
  'REDIS_NOT_INSTALLED',
  'MQTT_LOCALHOST_ONLY',
  'EXPECTED_DEV_DRIFT',
  'SEC21A_INFRA_SKIPPED'
]);

function classifyWarnings(validators) {
  const acceptable = [];
  const blocking = [];

  if (validators.integrity?.drift?.classification === 'Expected Drift') {
    acceptable.push({
      code: 'EXPECTED_DEV_DRIFT',
      message: validators.integrity.drift.reason,
      integrityScore: validators.integrity.integrityScore
    });
  }

  if (!validators.integrity?.aboveThreshold) {
    blocking.push({
      code: 'INTEGRITY_BELOW_THRESHOLD',
      message: `Score ${validators.integrity?.integrityScore} < ${validators.integrity?.threshold}`,
      severity: 'CRITICAL'
    });
  }

  if (validators.baseline?.divergences?.length && !validators.baseline.blocking) {
    acceptable.push({
      code: 'NON_CRITICAL_BASELINE_DRIFT',
      count: validators.baseline.divergences.length
    });
  }

  if (validators.baseline?.blocking) {
    blocking.push({ code: 'CRITICAL_FILE_DIVERGENCE', items: validators.baseline.criticalDivergences });
  }

  if (validators.security?.openNCs > 0 && validators.security.criticalNCs?.length === 0) {
    acceptable.push({ code: 'NC_BAIXA_OPEN', count: validators.security.openNCs });
  }

  if (validators.infrastructure?.skipped) {
    acceptable.push({ code: 'SEC21A_INFRA_SKIPPED', message: 'Infra probes skipped (test mode)' });
  }

  const moduleFailed = validators.modules?.failedModules || [];
  for (const f of moduleFailed) {
    blocking.push({ code: 'MODULE_FAILED', phase: f.phase, error: f.error });
  }

  if (!validators.security?.rollbackAvailable) {
    blocking.push({ code: 'ROLLBACK_UNAVAILABLE', severity: 'CRITICAL' });
  }

  return {
    acceptableWarnings: acceptable,
    blockingWarnings: blocking,
    ok: blocking.length === 0
  };
}

module.exports = { classifyWarnings, ACCEPTABLE_WARNINGS };
