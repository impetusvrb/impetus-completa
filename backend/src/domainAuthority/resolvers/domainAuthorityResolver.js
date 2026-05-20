'use strict';

const domainRegistry = require('../registry/domainRegistry');
const domainIsolationGuard = require('../guards/domainIsolationGuard');
const moduleInheritanceGuard = require('../guards/moduleInheritanceGuard');
const domainFlags = require('../config/domainFeatureFlags');
const semanticDomainResolver = require('./semanticDomainResolver');
const tenantOverrideLoader = require('../tenantOverrides/tenantOverrideLoader');
const functionalAxisResolver = require('../../services/functionalAxisResolver');
const { TAGS, log } = require('../observability/domainAuthorityLogger');

/**
 * Resolve autoridade contextual completa para um utilizador.
 * @param {object} user
 * @param {{ profile_code?: string, profile_config?: object }} dashboardContext
 */
function resolveDomainAuthority(user, dashboardContext = {}) {
  const axisPack = semanticDomainResolver.resolveSemanticAxis(user);
  const axis = domainRegistry.normalizeAxis(axisPack.functional_axis);
  const domain =
    tenantOverrideLoader.isEnabled() && user?.company_id ?
      tenantOverrideLoader.resolveDomainForTenant(user.company_id, axis) :
      domainRegistry.getDomain(axis);

  const profileCode = dashboardContext.profile_code || null;
  const rawModules = dashboardContext.profile_config?.visible_modules || [];

  let filtered = domainIsolationGuard.filterModules(rawModules, axis, {
    user_id: user?.id,
    profile_code: profileCode
  });
  if (moduleInheritanceGuard.isEnabled()) {
    const inh = moduleInheritanceGuard.filterModulesWithInheritance(filtered.modules, axis, {
      user_id: user?.id,
      profile_code: profileCode
    });
    filtered = { modules: inh.modules, blocked: [...filtered.blocked, ...inh.blocked] };
  }

  const contextualHints = functionalAxisResolver.getContextualModulesForAxis(axis);
  const hintFiltered = domainIsolationGuard.filterModules(contextualHints, axis, {
    user_id: user?.id,
    profile_code: profileCode
  });

  const authority = {
    domain_axis: axis,
    domain_definition: {
      axis: domain.axis,
      allowed_modules: domain.allowed_modules,
      denied_modules: domain.denied_modules,
      allowed_pipelines: domain.allowed_pipelines,
      denied_pipelines: domain.denied_pipelines,
      ai_contexts: domain.ai_contexts,
      tenant_overrides_supported: domain.tenant_overrides_supported
    },
    functional_axis: axisPack.functional_axis,
    functional_area: axisPack.functional_area,
    functional_area_source: axisPack.source,
    inference_priority: axisPack.priority,
    inference_trace: axisPack.inference_trace,
    governed_visible_modules: filtered.modules,
    blocked_modules: filtered.blocked,
    contextual_modules_hint: hintFiltered.modules,
    allowed_pipelines: domain.allowed_pipelines || [],
    denied_pipelines: domain.denied_pipelines || [],
    ai_contexts: domain.ai_contexts || [],
    semantic_keywords: domain.semantic_keywords || []
  };

  log(TAGS.RESOLVED, {
    user_id: user?.id,
    company_id: user?.company_id,
    domain_axis: axis,
    source: axisPack.source,
    governed_module_count: authority.governed_visible_modules.length,
    blocked_count: authority.blocked_modules.length,
    profile_code: profileCode
  });

  return authority;
}

/**
 * Aplica governança ao config de dashboard (additive — preserva original em profile_config).
 */
function applyGovernanceToDashboardConfig(user, config) {
  if (!config || !config.profile_config) return config;
  const authority = resolveDomainAuthority(user, {
    profile_code: config.profile_code,
    profile_config: config.profile_config
  });

  let modList = config.profile_config.visible_modules || [];
  let isolated = domainIsolationGuard.filterModules(modList, authority.domain_axis, {
    user_id: user?.id,
    profile_code: config.profile_code
  });
  if (moduleInheritanceGuard.isEnabled()) {
    const inh = moduleInheritanceGuard.filterModulesWithInheritance(isolated.modules, authority.domain_axis, {
      user_id: user?.id,
      profile_code: config.profile_code
    });
    isolated = { modules: inh.modules, blocked: [...(isolated.blocked || []), ...inh.blocked] };
  }

  return {
    ...config,
    functional_axis: authority.functional_axis,
    functional_area: authority.functional_area,
    functional_area_source: authority.functional_area_source,
    contextual_modules_hint: authority.contextual_modules_hint,
    domain_authority: authority,
    profile_config: {
      ...config.profile_config,
      visible_modules: isolated.modules,
      visible_modules_governed: true
    }
  };
}

module.exports = {
  resolveDomainAuthority,
  applyGovernanceToDashboardConfig
};
