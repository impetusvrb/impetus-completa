'use strict';

const { evaluatePublicationReadiness } = require('../../../../../shared/domain-publication/domainPublicationFramework.cjs');
const navFlags = require('../navigation/safetyNavigationFlags');
const rollout = require('./safetyActivationRolloutEngine');

/**
 * Validação de readiness para ativação SST (sem side-effects).
 */
function runSafeActivationChecks(ctx = {}) {
  const flags = navFlags.snapshot();
  const stage = rollout.resolveActivationStage();
  const readiness = evaluatePublicationReadiness({
    operationalRuntime: flags.operational,
    navigationRuntime: flags.navigation,
    publicationRuntime: flags.publication,
    moduleLicensed: ctx.hasSafetyIntelligenceModule !== false,
    tenantId: ctx.tenantId || null
  });
  return {
    domain: 'safety',
    readiness,
    activation_stage: stage,
    flags,
    definitive_publication: rollout.allowsDefinitivePublication(stage),
    rollout: rollout.describeRolloutProgress(stage)
  };
}

module.exports = { runSafeActivationChecks };
