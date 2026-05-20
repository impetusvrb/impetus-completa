'use strict';

function _on(name, defaultOn = true) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isSafetyDomainIsolationEnabled: () => _on('IMPETUS_SAFETY_DOMAIN_ISOLATION', true),
  isRuntimeTechnicalGuardEnabled: () => _on('IMPETUS_RUNTIME_TECHNICAL_GUARD', true),
  isDomainInheritanceGovernanceEnabled: () => _on('IMPETUS_DOMAIN_INHERITANCE_GOVERNANCE', true),
  isDomainAuthorityEnabled: () => _on('IMPETUS_DOMAIN_AUTHORITY', true)
};
