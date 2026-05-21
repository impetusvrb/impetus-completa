'use strict';

function buildContextualAuthorityRegistry(identity = {}, domainAuthority = {}) {
  return {
    tenant_id: identity.tenant_id,
    domain_axis: identity.domain_axis,
    allowed_modules: domainAuthority.allowed_modules || domainAuthority.authority?.allowed_modules || [],
    denied_modules: domainAuthority.denied_modules || domainAuthority.authority?.denied_modules || [],
    governed_visible_modules: domainAuthority.governed_visible_modules || [],
    blocked_modules: domainAuthority.blocked_modules || [],
    allowed_pipelines: domainAuthority.allowed_pipelines || [],
    denied_pipelines: domainAuthority.denied_pipelines || [],
    ai_contexts: domainAuthority.ai_contexts || [],
    registry_version: 'Z.0',
    enforcement_active: false
  };
}

module.exports = { buildContextualAuthorityRegistry };
