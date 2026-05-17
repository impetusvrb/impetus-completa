'use strict';

const navFlags = require('../navigation/qualityNavigationFlags');
const { evaluatePublicationReadiness } = require('../../../../../shared/domain-publication/domainPublicationFramework.cjs');
const telemetry = require('./qualityActivationTelemetry');
const audit = require('./qualityActivationAudit');
const rollout = require('./qualityActivationRolloutEngine');

function truthy(v) {
  return String(v || '').toLowerCase() === 'true' || v === '1';
}

/**
 * Validações seguras antes de activação (sem side-effects externos).
 * @param {object} [payload]
 * @param {boolean} [payload.hasQualityIntelligenceModule] — tenant tem módulo (informado por caller / cache)
 * @param {string|null} [payload.tenantId]
 */
function runSafeActivationChecks(payload = {}) {
  const t0 = Date.now();
  const flags = navFlags.snapshot();
  const operational = truthy(process.env.IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED);
  const navigation = truthy(process.env.IMPETUS_QUALITY_NAVIGATION_RUNTIME_ENABLED);
  const publication = truthy(process.env.IMPETUS_QUALITY_PUBLICATION_RUNTIME_ENABLED);
  const moduleOk = payload.hasQualityIntelligenceModule !== false;

  const readiness = evaluatePublicationReadiness({
    operationalRuntime: operational,
    navigationRuntime: navigation,
    publicationRuntime: publication,
    moduleLicensed: moduleOk,
    tenantId: payload.tenantId || null
  });

  const stage = rollout.resolveActivationStage();
  const liveOk = rollout.allowsDefinitivePublication(stage, process.env.IMPETUS_QUALITY_PUBLICATION_SHADOW_MODE);

  const checks = {
    operational_runtime: operational,
    navigation_runtime: navigation,
    publication_runtime: publication,
    navigation_flags_snapshot: flags,
    quality_intelligence_assumed: moduleOk,
    readiness,
    activation_stage: stage,
    definitive_publication_allowed: readiness.ready && liveOk,
    shadow_only: !liveOk || flags.rollout_shadow === true
  };

  telemetry.noteSafeCheckMs(Date.now() - t0);
  audit.recordQualityActivationAudit({
    event: 'safe_activation_check',
    tenant: payload.tenantId || null,
    meta: { checks_summary: { ready: readiness.ready, stage } }
  });

  return checks;
}

module.exports = { runSafeActivationChecks };
