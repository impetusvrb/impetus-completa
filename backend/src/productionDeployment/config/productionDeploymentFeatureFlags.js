'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isProductionDeploymentEnabled: () => _flag('IMPETUS_PRODUCTION_DEPLOYMENT', false),
  isDeploymentValidationEnabled: () => _flag('IMPETUS_DEPLOYMENT_VALIDATION', false),
  isSafeReloadCoordinationEnabled: () => _flag('IMPETUS_SAFE_RELOAD_COORDINATION', false),
  isDeploymentObservabilityEnabled: () => _flag('IMPETUS_DEPLOYMENT_OBSERVABILITY', true)
};
