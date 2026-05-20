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
const domainFlags = require('./config/domainFeatureFlags');
const ehsPublicationGuard = require('./resolvers/ehsPublicationGuard');
const moduleInheritanceGuard = require('./guards/moduleInheritanceGuard');
const technicalRuntimeAccessGuard = require('./guards/technicalRuntimeAccessGuard');

function isDomainAuthorityEnabled() {
  return domainFlags.isDomainAuthorityEnabled();
}

module.exports = {
  isDomainAuthorityEnabled,
  domainFlags,
  domainRegistry,
  domainIsolationGuard,
  moduleInheritanceGuard,
  technicalRuntimeAccessGuard,
  ehsPublicationGuard,
  domainAuthorityResolver,
  semanticDomainResolver,
  semanticPriorityPolicy,
  pipelineRegistry,
  domainCapabilities,
  tenantOverrideLoader,
  domainAuthorityLogger,
  resolveDomainAuthority: domainAuthorityResolver.resolveDomainAuthority,
  applyGovernanceToDashboardConfig: domainAuthorityResolver.applyGovernanceToDashboardConfig,
  shouldPublishEnvironmentNavigation: ehsPublicationGuard.shouldPublishEnvironmentNavigation
};
