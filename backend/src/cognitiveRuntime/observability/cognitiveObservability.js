'use strict';

const flags = require('../config/phaseZ18FeatureFlags');
const { logPhaseZ18 } = require('../phaseZ18Logger');
const { resolveShadowCompositionPlan } = require('../composition/compositionShadowResolver');
const { inspectSemanticDelivery } = require('./semanticDeliveryInspector');
const { getRegistryStats } = require('../registry/cognitiveBlockRegistry');

function buildCognitiveObservabilityReport(user = {}, payload = {}, ctx = {}) {
  if (!flags.isSemanticDeliveryObservabilityEnabled() && !flags.isCognitiveRuntimeEnabled()) {
    return {
      phase: 'Z.18',
      observability_skipped: true,
      reason: 'semantic_delivery_observability_off'
    };
  }

  const shadowPlan = resolveShadowCompositionPlan(user, payload, ctx);
  const inspection = inspectSemanticDelivery(payload, {
    ...ctx,
    composition_gap: shadowPlan.composition_gap,
    profile_code: shadowPlan.profile_code,
    domain_axis: shadowPlan.domain_axis
  });

  const report = {
    phase: 'Z.18',
    layer: 'cognitive-runtime-foundation',
    shadow_only: !flags.isCognitiveRuntimeEnabled(),
    registry: getRegistryStats(),
    shadow_composition: shadowPlan.shadow_skipped
      ? { skipped: true, reason: shadowPlan.reason }
      : {
          domain_axis: shadowPlan.domain_axis,
          recommended_block_ids: shadowPlan.recommended_block_ids,
          eligible_count: shadowPlan.eligible_blocks?.length || 0,
          composition_gap: shadowPlan.composition_gap,
          plan_valid: shadowPlan.plan_valid
        },
    semantic_delivery: {
      classification: inspection.delivery_classification,
      semantic_score: inspection.semantic_score,
      genericity_ratio: inspection.genericity.genericity_ratio,
      is_semantically_generic: inspection.genericity.is_semantically_generic,
      ideal_semantic_missing: inspection.genericity.ideal_semantic_missing,
      cross_domain_signals: inspection.cross_domain_signals,
      cognitive_composition_ready: inspection.cognitive_composition_ready
    },
    auto_compose: false,
    auto_remediate: false,
    delivery_mutation: false
  };

  if (
    flags.isSemanticDeliveryObservabilityEnabled() &&
    inspection.genericity.is_semantically_generic
  ) {
    logPhaseZ18('SEMANTIC_GENERICITY_DETECTED', {
      tenant_id: user?.company_id,
      profile: payload.profile_code,
      domain: inspection.domain_axis,
      score: inspection.semantic_score.average_score,
      genericity_ratio: inspection.genericity.genericity_ratio
    });
  }

  return report;
}

module.exports = {
  buildCognitiveObservabilityReport
};
