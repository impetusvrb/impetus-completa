'use strict';

const { evaluatePublicationReadiness } = require('../../../../../shared/domain-publication/domainPublicationFramework.cjs');
const navFlags = require('../navigation/environmentNavigationFlags');
const rollout = require('./environmentActivationRolloutEngine');

function runSafeActivationChecks(ctx = {}) {
  const flags = navFlags.snapshot();
  const stage = rollout.resolveActivationStage();
  const readiness = evaluatePublicationReadiness({
    operationalRuntime: flags.operational,
    navigationRuntime: flags.navigation,
    publicationRuntime: flags.publication,
    moduleLicensed: ctx.hasEnvironmentIntelligenceModule !== false,
    tenantId: ctx.tenantId || null
  });
  return {
    domain: 'environment',
    readiness,
    activation_stage: stage,
    flags,
    definitive_publication: rollout.allowsDefinitivePublication(stage),
    rollout: rollout.describeRolloutProgress(stage)
  };
}

module.exports = { runSafeActivationChecks };
