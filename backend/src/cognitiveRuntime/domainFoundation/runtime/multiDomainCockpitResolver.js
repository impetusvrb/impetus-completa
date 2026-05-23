'use strict';

const { getDomainDefinition, listReadyDomains } = require('../registry/cognitiveDomainRegistry');
const { resolveDomainFromProfile } = require('../registry/domainSemanticProfiles');
const { buildCompositionConfig, resolvePersonaTier } = require('../registry/cockpitCompositionRegistry');
const flagsZ24 = require('../../config/phaseZ24FeatureFlags');

function resolveMultiDomainCockpit(user = {}, payload = {}, ctx = {}) {
  const profileCode = payload.profile_code || ctx.profile_code || '';
  const functionalArea = payload.functional_area || ctx.functional_area || '';
  const resolvedDomain = resolveDomainFromProfile(profileCode, functionalArea) || ctx.domain_axis;

  if (!resolvedDomain) {
    return {
      resolved: false,
      reason: 'domain_not_resolved',
      domain: null,
      cockpit_ready: false,
      composition: null
    };
  }

  const def = getDomainDefinition(resolvedDomain);
  if (!def) {
    return {
      resolved: false,
      reason: 'domain_definition_missing',
      domain: resolvedDomain,
      cockpit_ready: false,
      composition: null
    };
  }

  const readyDomains = listReadyDomains();
  const cockpitReady = def.cockpit_ready === true && readyDomains.includes(resolvedDomain);

  const composition = buildCompositionConfig(resolvedDomain, profileCode);

  return {
    resolved: true,
    domain: resolvedDomain,
    domain_label: def.label,
    maturity: def.maturity,
    cockpit_ready: cockpitReady,
    persona_tier: resolvePersonaTier(profileCode),
    composition,
    foundation_mode: flagsZ24.multiDomainFoundationMode(),
    cognitive_orchestration: flagsZ24.isCognitiveOrchestrationEnabled(),
    ready_domains: readyDomains
  };
}

module.exports = { resolveMultiDomainCockpit };
