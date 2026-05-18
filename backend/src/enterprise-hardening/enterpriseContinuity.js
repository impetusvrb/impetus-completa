'use strict';

const multi = require('../enterprise-shadow-stabilization/multiDomainPublicationValidator');
const rollout = require('../runtime-validation/enterpriseControlledRolloutEngine');

function enterprisePublicationContinuityRuntime() {
  const pub = multi.validateMultiDomainPublication();
  return {
    ok: pub.publication_stable,
    pipeline_order: pub.pipeline_order,
    fragmentation_risk: !pub.publication_stable
  };
}

function enterpriseRolloutContinuityRuntime(ctx = {}) {
  const r = rollout.evaluateControlledRollout({ ...ctx, current_stage: 'shadow' });
  return {
    ok: r.auto_promotion === false,
    stage: r.recommended_stage || 'shadow',
    fragmentation_risk: false,
    auto_promotion: false
  };
}

function enterpriseIndustrialContinuityRuntime(pack = {}) {
  const publication = enterprisePublicationContinuityRuntime();
  const rolloutCont = enterpriseRolloutContinuityRuntime(pack);
  const telemetryOk = pack.telemetry?.ok !== false;
  const edgeOk = pack.edge?.ok !== false;
  const contextualOk = pack.cognitive?.ok !== false;
  return {
    ok: publication.ok && rolloutCont.ok && telemetryOk && edgeOk && contextualOk,
    publication,
    rollout: rolloutCont,
    runtime_continuity: telemetryOk && edgeOk,
    contextual_continuity: contextualOk,
    operational_continuity: publication.ok && telemetryOk,
    fragmentation_detected: publication.fragmentation_risk || rolloutCont.fragmentation_risk,
    assistive_only: true
  };
}

module.exports = {
  enterpriseIndustrialContinuityRuntime,
  enterprisePublicationContinuityRuntime,
  enterpriseRolloutContinuityRuntime
};
