'use strict';

const flagsZ23 = require('../config/phaseZ23FeatureFlags');
const c2 = require('../config/phaseC2FeatureFlags');

function evaluateQualityControlledAuthority(payload = {}, ctx = {}) {
  const rt = payload.specialized_cockpit_runtime || payload.quality_cognitive_runtime;
  const consolidated = rt?.consolidation_applied === true && rt?.cockpit_mode === 'quality_native';
  const promotion = payload.cognitive_render_promotion?.promotion_applied === true;
  const pilot = flagsZ23.isQualityNativeCockpitPilot() || flagsZ23.isSpecializedCockpitActive();

  const promoted = payload.widgets_promoted?.length ?? 0;
  const legacy = payload.widgets_legacy?.length ?? payload.profile_config?.widgets?.length ?? 0;
  const widget_authority_ratio = promoted / Math.max(promoted + legacy, 1);

  const timelineFromZ = !!(payload.quality_operational_metrics || payload.quality_insights || rt?.centers?.length);
  const timeline_authority_ratio = timelineFromZ && consolidated ? 0.85 : consolidated ? 0.5 : 0.2;

  const insight_authority_ratio =
    (payload.quality_insights?.length ? 0.9 : payload.quality_contextual_questions?.length ? 0.75 : 0.3) *
    (consolidated ? 1 : 0.5);

  const fallback_usage_ratio = Number((legacy / Math.max(promoted + legacy, 1)).toFixed(3));
  const v2Widgets = payload.engine_v2?.payload?.layout?.widgets?.length ?? 0;
  const legacy_dependency_detected = legacy > promoted || (v2Widgets > 0 && !promotion);

  const runtime_authority_score = Number(
    Math.min(
      1,
      (consolidated ? 0.35 : 0) +
        (promotion ? 0.25 : 0) +
        widget_authority_ratio * 0.2 +
        timeline_authority_ratio * 0.1 +
        insight_authority_ratio * 0.1 -
        fallback_usage_ratio * 0.15
    ).toFixed(3)
  );

  const frontend_alignment_ratio = ctx.frontend_convergence_score ?? ctx.frontend_runtime_alignment ?? 0.55;

  const authoritative_controlled =
    c2.isQualityControlledAuthorityEnabled() &&
    pilot &&
    consolidated &&
    promotion &&
    runtime_authority_score >= 0.55 &&
    !c2.authoritativeGlobal;

  const readiness_score = Number(
    Math.min(1, runtime_authority_score * 0.5 + frontend_alignment_ratio * 0.3 + (1 - fallback_usage_ratio) * 0.2).toFixed(3)
  );

  return {
    domain: 'quality',
    authority_mode: authoritative_controlled ? 'AUTHORITATIVE_CONTROLLED' : consolidated ? 'CONTROLLED' : 'SHADOW',
    runtime_authority_score,
    fallback_usage_ratio,
    widget_authority_ratio: Number(widget_authority_ratio.toFixed(3)),
    timeline_authority_ratio: Number(timeline_authority_ratio.toFixed(3)),
    insight_authority_ratio: Number(insight_authority_ratio.toFixed(3)),
    frontend_alignment_ratio: Number(frontend_alignment_ratio.toFixed(3)),
    legacy_dependency_detected,
    readiness_score,
    auto_decisions: false,
    auto_remediation: false,
    governs: authoritative_controlled
      ? ['widgets', 'delivery', 'timeline', 'insights', 'contextual_memory', 'cognitive_feed', 'operational_narrative']
      : []
  };
}

module.exports = { evaluateQualityControlledAuthority };
