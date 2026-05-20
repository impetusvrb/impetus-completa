'use strict';

const cognitiveFlags = require('./config/cognitiveFeatureFlags');
const { SAFE_MINIMAL_POLICY, SAFE_MINIMAL_EXPOSURE } = require('./policies/safeMinimalPolicy');
const { resolveContentExposure } = require('./unifiedExposureResolver');
const { evaluateContentExposure } = require('./contentExposurePolicyEngine');
const { resolveCognitiveEnvelope } = require('./cognitiveEnvelopeResolver');
const { resolvePrecedence, filterByDenyList } = require('./policyPrecedenceResolver');
const { logCognitive } = require('./policyDecisionLogger');
const phaseFFlags = require('./config/phaseFFeatureFlags');
const cognitiveGovernanceFacade = require('./cognitiveGovernanceFacade');
const { buildSecureChatContext } = require('./channels/secureChatContextBuilder');
const { resolveGovernedKpis } = require('./channels/secureKpiExposureResolver');

module.exports = {
  cognitiveFlags,
  phaseFFlags,
  cognitiveGovernanceFacade,
  buildSecureChatContext,
  resolveGovernedKpis,
  SAFE_MINIMAL_POLICY,
  SAFE_MINIMAL_EXPOSURE,
  resolveContentExposure,
  evaluateContentExposure,
  resolveCognitiveEnvelope,
  resolvePrecedence,
  filterByDenyList,
  logCognitive
};
