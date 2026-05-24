'use strict';

const flagsZP0 = require('../config/phaseZP0FeatureFlags');
const c4 = require('../config/phaseC4FeatureFlags');

function evaluateProductionControlledAuthority(payload = {}, ctx = {}) {
  const rt = payload.production_cognitive_runtime;
  const consolidated = rt?.consolidation_applied === true && rt?.cockpit_mode === 'production_native';
  const promotion = payload.cognitive_render_promotion?.promotion_applied === true;
  const pilot = flagsZP0.isProductionNativeCockpitPilot() || flagsZP0.isProductionCognitiveRuntimeActive();

  const promoted = payload.widgets_promoted?.length ?? 0;
  const legacy = payload.widgets_legacy?.length ?? payload.profile_config?.widgets?.length ?? 0;
  const delivery_authority_ratio = promoted / Math.max(promoted + legacy, 1);

  const insight_authority_ratio =
    (payload.production_contextual_questions?.length ? 0.85 : 0.35) *
    (payload.production_cognitive_runtime?.consolidation_applied ? 1 : 0.45);

  const bottleneck_authority_ratio = payload.production_bottleneck_runtime?.primary_bottleneck ? 0.88 : 0.4;
  const economic_runtime_authority_ratio = payload.operational_economic_runtime?.heuristic_model ? 0.8 : 0.35;

  const fallback_usage_ratio = Number((legacy / Math.max(promoted + legacy, 1)).toFixed(3));

  const runtime_authority_score = Number(
    Math.min(
      1,
      (consolidated ? 0.3 : 0) +
        (promotion ? 0.2 : 0) +
        delivery_authority_ratio * 0.2 +
        insight_authority_ratio * 0.1 +
        bottleneck_authority_ratio * 0.1 +
        economic_runtime_authority_ratio * 0.1 -
        fallback_usage_ratio * 0.12
    ).toFixed(3)
  );

  const migration_safety_score = Number(
    Math.min(1, (1 - fallback_usage_ratio) * 0.5 + (ctx.escalation_safe ? 0.3 : 0.1) + (ctx.certification_safe ? 0.2 : 0)).toFixed(3)
  );

  const authoritative_controlled =
    c4.isProductionAuthoritativeControlled() &&
    pilot &&
    consolidated &&
    promotion &&
    runtime_authority_score >= 0.58 &&
    migration_safety_score >= 0.45 &&
    !c4.authoritativeGlobal;

  return {
    domain: 'production',
    authority_mode: authoritative_controlled ? 'AUTHORITATIVE_CONTROLLED' : consolidated ? 'CONTROLLED' : 'SHADOW',
    runtime_authority_score,
    delivery_authority_ratio: Number(delivery_authority_ratio.toFixed(3)),
    insight_authority_ratio: Number(insight_authority_ratio.toFixed(3)),
    bottleneck_authority_ratio: Number(bottleneck_authority_ratio.toFixed(3)),
    economic_runtime_authority_ratio: Number(economic_runtime_authority_ratio.toFixed(3)),
    fallback_usage_ratio,
    migration_safety_score,
    rollback_ready: true,
    runtime_safe: !payload.auto_remediation && !payload.auto_decisions,
    auto_remediation: false,
    auto_decisions: false,
    governs: authoritative_controlled
      ? [
          'delivery',
          'insights',
          'timeline',
          'bottleneck_reasoning',
          'economic_runtime',
          'operational_graph',
          'confidence_runtime',
          'utility_runtime'
        ]
      : []
  };
}

module.exports = { evaluateProductionControlledAuthority };
