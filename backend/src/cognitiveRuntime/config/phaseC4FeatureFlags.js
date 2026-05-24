'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1' || v === 'controlled';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  return v;
}

module.exports = {
  isProductionAuthoritativeControlled: () =>
    _mode('IMPETUS_C4_PRODUCTION_AUTHORITATIVE', 'off') === 'controlled' || _flag('IMPETUS_C4_PRODUCTION_AUTHORITATIVE', false),
  isFrontendConvergenceEnabled: () => _flag('IMPETUS_C4_FRONTEND_CONVERGENCE', true),
  isDeliveryCertificationEnabled: () => _flag('IMPETUS_C4_DELIVERY_CERTIFICATION', true),
  isOperationalTruthEnabled: () => _flag('IMPETUS_C4_OPERATIONAL_TRUTH', true),
  isExecutiveAlignmentEnabled: () => _flag('IMPETUS_C4_EXECUTIVE_ALIGNMENT', true),
  isC4ObservabilityEnabled: () => _flag('IMPETUS_C4_OBSERVABILITY', true),
  autoRemediation: false,
  autoDecisions: false,
  authoritativeGlobal: false,
  adaptiveMutation: false
};
