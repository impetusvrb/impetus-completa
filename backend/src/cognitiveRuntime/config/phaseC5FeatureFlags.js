'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

module.exports = {
  isRuntimeIntegrityEnabled: () => _flag('IMPETUS_C5_RUNTIME_INTEGRITY', true),
  isPressureManagementEnabled: () => _flag('IMPETUS_C5_PRESSURE_MANAGEMENT', true),
  isRuntimeStabilityEnabled: () => _flag('IMPETUS_C5_RUNTIME_STABILITY', true),
  isMultiTenantIsolationEnabled: () => _flag('IMPETUS_C5_MULTI_TENANT_ISOLATION', true),
  isDriftDetectionEnabled: () => _flag('IMPETUS_C5_DRIFT_DETECTION', true),
  isC5ObservabilityEnabled: () => _flag('IMPETUS_C5_OBSERVABILITY', true),
  autoRemediation: false,
  autoDecisions: false,
  authoritativeGlobal: false,
  adaptiveMutation: false
};
