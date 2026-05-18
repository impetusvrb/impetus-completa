'use strict';

const runtime = require('../runtime-validation/enterpriseRuntimeValidationEngine');
const validation = require('../runtime-validation/enterpriseRuntimeValidationOrchestrator');
const shadow = require('../enterprise-shadow-stabilization/enterpriseShadowStabilizationOrchestrator');
const pilot = require('../enterprise-pilot-rollout/enterprisePilotRolloutOrchestrator');
const multiPub = require('../enterprise-shadow-stabilization/multiDomainPublicationValidator');

/**
 * Fase 1 — validação runtime do ecossistema QUALITY + SAFETY + LOGISTICS.
 */
function validateEcosystemRuntime(reqBody = {}) {
  const tenantId = reqBody.tenant_id || null;
  const snap = runtime.validateEnterpriseRuntime(reqBody);
  const pack = validation.runEnterpriseValidationPack({ ...reqBody, tenant_id: tenantId });
  const shadowCycle = shadow.runShadowStabilizationCycle({ ...reqBody, tenant_id: tenantId });
  const pilotPrep = pilot.runPilotRolloutPreparation({ ...reqBody, tenant_id: tenantId });
  const publication = multiPub.validateMultiDomainPublication(reqBody);

  const domains = ['quality', 'safety', 'logistics', 'environment'];
  const stable =
    snap.stable &&
    publication.publication_stable !== false &&
    !pack.runtime_validation?.conflicts?.length &&
    shadowCycle.multi_domain_publication?.publication_stable !== false;

  return {
    ok: true,
    stable,
    domains,
    runtime_snapshot: snap,
    validation_pack: {
      framework: pack.framework,
      enterprise_decision: pack.enterprise_decision,
      controlled_rollout: pack.controlled_rollout
    },
    shadow_cycle: {
      tenant_pilot_readiness: shadowCycle.tenant_pilot_readiness,
      friction: shadowCycle.friction,
      rollout_recommendation: shadowCycle.rollout_recommendation
    },
    pilot_preparation: {
      recommendation: pilotPrep.recommendation,
      dashboard: pilotPrep.dashboard
    },
    publication,
    coexistence: {
      ia_chat_dashboard: true,
      legacy_coexistence: snap.legacy_coexistence,
      bounded_publication: publication.bounded_publication
    },
    navigation_stable: stable,
    lazy_routes_safe: snap.mount_issues?.length === 0
  };
}

module.exports = { validateEcosystemRuntime };
