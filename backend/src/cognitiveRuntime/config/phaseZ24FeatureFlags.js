'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (['on', 'shadow', 'controlled', 'active'].includes(v)) return v === 'on' ? 'active' : v;
  return 'off';
}

module.exports = {
  multiDomainFoundationMode: () => _mode('IMPETUS_MULTI_DOMAIN_FOUNDATION', 'off'),
  isMultiDomainActive: () => {
    const m = _mode('IMPETUS_MULTI_DOMAIN_FOUNDATION', 'off');
    return m === 'active' || m === 'controlled';
  },
  isMultiDomainShadow: () => _mode('IMPETUS_MULTI_DOMAIN_FOUNDATION', 'off') === 'shadow',
  isCognitiveOrchestrationEnabled: () => _mode('IMPETUS_COGNITIVE_ORCHESTRATION', 'off') !== 'off',
  isSemanticDomainRuntimeEnabled: () => _mode('IMPETUS_SEMANTIC_DOMAIN_RUNTIME', 'off') !== 'off',
  isMultiDomainObservabilityEnabled: () => _flag('IMPETUS_MULTI_DOMAIN_OBSERVABILITY', true),
  globalReplace: false,
  autoRemediation: false,
  boundaryGovernance: false
};
