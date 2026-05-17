'use strict';

const { evaluatePublicationReadiness } = require('../../../../../shared/domain-publication/domainPublicationFramework.cjs');
const navFlags = require('../navigation/logisticsNavigationFlags');
const rollout = require('./logisticsActivationRolloutEngine');

function runSafeActivationChecks(ctx = {}) {
  const flags = navFlags.snapshot();
  const stage = rollout.resolveActivationStage();
  const readiness = evaluatePublicationReadiness({
    operationalRuntime: flags.operational,
    navigationRuntime: flags.navigation,
    publicationRuntime: flags.publication,
    moduleLicensed: ctx.hasLogisticsIntelligenceModule !== false,
    tenantId: ctx.tenantId || null
  });
  return {
    domain: 'logistics',
    readiness,
    activation_stage: stage,
    flags,
    definitive_publication: rollout.allowsDefinitivePublication(stage),
    rollout: rollout.describeRolloutProgress(stage)
  };
}

module.exports = { runSafeActivationChecks };
