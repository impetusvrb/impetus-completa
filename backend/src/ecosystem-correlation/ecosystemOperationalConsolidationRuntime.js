'use strict';

const ecosystemVal = require('../enterprise-ecosystem-consolidation/enterpriseEcosystemRuntimeValidator');
const rollout = require('../runtime-validation/enterpriseControlledRolloutEngine');

function ecosystemOperationalConsolidationRuntime(reqBody = {}) {
  const ecosystem = ecosystemVal.validateEcosystemRuntime(reqBody);
  const controlled = rollout.evaluateControlledRollout({
    tenant_id: reqBody.tenant_id,
    current_stage: 'shadow',
    pilot_readiness: { level: 'SHADOW_READY', score: 55 }
  });
  return {
    ok: ecosystem.stable,
    ecosystem_runtime: ecosystem,
    controlled_rollout: { ...controlled, auto_promotion: false },
    consolidation_stable: ecosystem.stable && ecosystem.coexistence?.ia_chat_dashboard,
    assistive_only: true
  };
}

function ecosystemBehaviorStabilityRuntime(tenantId) {
  const behavior = require('./ecosystemOperationalBehaviorCorrelationRuntime');
  return behavior.ecosystemOperationalBehaviorCorrelationRuntime(tenantId);
}

function ecosystemCognitivePressureRuntime(ctx = {}) {
  const sat = require('../domains/environment/pilot-rollout/environmentCognitiveSaturationRuntime');
  return sat.runEnvironmentCognitiveSaturationPack(ctx);
}

function ecosystemOperationalMaturityRuntime(ctx = {}) {
  const mat = require('./ecosystemMaturityCorrelationRuntime');
  return mat.ecosystemMaturityCorrelationRuntime(ctx);
}

function ecosystemCrossDomainStabilityRuntime() {
  const multi = require('../enterprise-shadow-stabilization/multiDomainPublicationValidator');
  const pub = multi.validateMultiDomainPublication();
  return {
    ok: pub.publication_stable,
    pipeline_order: pub.pipeline_order,
    publication_stable: pub.publication_stable
  };
}

module.exports = {
  ecosystemOperationalConsolidationRuntime,
  ecosystemBehaviorStabilityRuntime,
  ecosystemCognitivePressureRuntime,
  ecosystemOperationalMaturityRuntime,
  ecosystemCrossDomainStabilityRuntime
};
