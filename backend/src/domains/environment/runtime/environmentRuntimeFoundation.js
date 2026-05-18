'use strict';

const navFlags = require('../navigation/environmentNavigationFlags');
const rollout = require('../activation/environmentActivationRolloutEngine');
const enterpriseCognitive = require('../../../runtime-validation/enterpriseCognitiveMaturityEngine');
const enterpriseRollout = require('../../../runtime-validation/enterpriseControlledRolloutEngine');
const enterpriseAudience = require('../../../runtime-validation/enterpriseAudienceValidationRuntime');
const enterpriseUx = require('../../../runtime-validation/enterpriseContextualUxValidator');
const enterpriseBehavior = require('../../../runtime-validation/enterpriseOperationalBehaviorEngine');

function environmentOperationalRuntime(ctx = {}) {
  return { domain: 'environment', layer: 'operations', enabled: navFlags.isOperationalEnabled(), shadow: navFlags.isShadowPublication(), ...ctx };
}

function environmentGovernanceRuntime(ctx = {}) {
  return {
    domain: 'environment',
    layer: 'governance',
    enabled: navFlags.isPublicationEnabled(),
    stage: rollout.resolveActivationStage(),
    ...ctx
  };
}

function environmentNavigationRuntime() {
  return { domain: 'environment', ...navFlags.snapshot(), bounded: true };
}

function environmentPublicationRuntime(user, opts) {
  const pub = require('../navigation/environmentNavigationPublicationService');
  return pub.buildPublicationContext(user, opts);
}

function environmentAudienceRuntime(samples) {
  return enterpriseAudience.validateAudienceMatrix(samples || []);
}

function environmentActivationRuntime(tenantId) {
  const health = require('../activation/environmentPublicationHealthService');
  return health.runSafeActivationChecks({ tenantId, hasEnvironmentIntelligenceModule: true });
}

function environmentRolloutRuntime(pack) {
  return enterpriseRollout.evaluateControlledRollout(pack || {});
}

function environmentOperationalValidationRuntime(reqBody) {
  const orch = require('../analytics/environmentOperationalValidationOrchestrator');
  return orch.runEnvironmentOperationalValidationPack(reqBody);
}

function environmentContextualUxRuntime(input) {
  return enterpriseUx.validateContextualUx(input || {});
}

function environmentCognitiveValidationRuntime(input) {
  return enterpriseCognitive.analyzeCognitiveMaturity(input || {});
}

function environmentOperationalBehaviorRuntime(evt) {
  return enterpriseBehavior.recordOperationalEvent({ ...evt, domain: 'environment' });
}

function environmentOperationalMaturityRuntime(input) {
  const cog = enterpriseCognitive.analyzeCognitiveMaturity(input || {});
  return { domain: 'environment', maturity: cog, assistive_only: true };
}

function environmentControlledRolloutRuntime(pack) {
  const r = enterpriseRollout.evaluateControlledRollout(pack || {});
  return { ...r, domain: 'environment', auto_promotion: false };
}

module.exports = {
  environmentOperationalRuntime,
  environmentGovernanceRuntime,
  environmentNavigationRuntime,
  environmentPublicationRuntime,
  environmentAudienceRuntime,
  environmentActivationRuntime,
  environmentRolloutRuntime,
  environmentOperationalValidationRuntime,
  environmentContextualUxRuntime,
  environmentCognitiveValidationRuntime,
  environmentOperationalBehaviorRuntime,
  environmentOperationalMaturityRuntime,
  environmentControlledRolloutRuntime
};
