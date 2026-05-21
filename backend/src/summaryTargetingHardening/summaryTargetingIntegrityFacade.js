'use strict';

const flags = require('../summaryRuntimeActivation/config/phaseZ9FeatureFlags');
const { analyzeHierarchyNarrativeTargeting } = require('./hierarchyNarrativeTargeting');
const { analyzeFunctionalNarrativeTargeting } = require('./functionalNarrativeTargeting');
const { assessNarrativeAuthorityConsistency } = require('./narrativeAuthorityConsistency');
const { hardenCrossDomainNarrative } = require('./narrativeCrossDomainHardening');

function analyzeSummaryTargetingIntegrity(summaryPayload = {}, ctx = {}) {
  const hierarchy = analyzeHierarchyNarrativeTargeting(summaryPayload, ctx);
  const functional = analyzeFunctionalNarrativeTargeting(summaryPayload, ctx);
  const authority = assessNarrativeAuthorityConsistency({ hierarchy, functional }, ctx);
  const hardening = hardenCrossDomainNarrative(summaryPayload, ctx);

  return {
    phase: 'Z.9',
    hardening_enabled: flags.isSummaryTargetingHardeningEnabled(),
    hierarchy,
    functional,
    authority,
    hardening,
    narrative_leakage_detected: hierarchy.narrative_leakage || functional.cross_domain_risk,
    recommendation_only: !flags.isSummaryTargetingHardeningEnabled()
  };
}

module.exports = { analyzeSummaryTargetingIntegrity };
