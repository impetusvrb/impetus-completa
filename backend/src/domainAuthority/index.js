'use strict';

/**
 * Domain Authority Engine — governança contextual enterprise (Fase C).
 * Additive-only: consumidores legados podem ignorar este módulo.
 */

const domainRegistry = require('./registry/domainRegistry');
const domainIsolationGuard = require('./guards/domainIsolationGuard');
const domainAuthorityResolver = require('./resolvers/domainAuthorityResolver');
const semanticDomainResolver = require('./resolvers/semanticDomainResolver');
const semanticPriorityPolicy = require('./policies/semanticPriorityPolicy');
const pipelineRegistry = require('./pipelines/pipelineRegistry');
const domainCapabilities = require('./capabilities/domainCapabilities');
const tenantOverrideLoader = require('./tenantOverrides/tenantOverrideLoader');
const domainAuthorityLogger = require('./observability/domainAuthorityLogger');

function isDomainAuthorityEnabled() {
  return String(process.env.IMPETUS_DOMAIN_AUTHORITY || 'on').toLowerCase() !== 'off';
}

module.exports = {
  isDomainAuthorityEnabled,
  domainRegistry,
  domainIsolationGuard,
  domainAuthorityResolver,
  semanticDomainResolver,
  semanticPriorityPolicy,
  pipelineRegistry,
  domainCapabilities,
  tenantOverrideLoader,
  domainAuthorityLogger,
  resolveDomainAuthority: domainAuthorityResolver.resolveDomainAuthority,
  applyGovernanceToDashboardConfig: domainAuthorityResolver.applyGovernanceToDashboardConfig
};
