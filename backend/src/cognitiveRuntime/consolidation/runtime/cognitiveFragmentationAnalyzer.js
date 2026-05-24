'use strict';

function analyzeCognitiveFragmentation(payload = {}, authority = {}, dominance = {}) {
  const pipelines = [];
  if (payload.engine_v2) pipelines.push('engine_v2');
  if (authority.runtime_z_present) pipelines.push('runtime_z');
  if (authority.motor_a_pressure > 0.1) pipelines.push('motor_a');
  if (payload.cognitive_render_promotion) pipelines.push('render_promotion');
  if (payload.adaptive_orchestration) pipelines.push('adaptive_orchestration');
  if (payload.governance_learning) pipelines.push('governance_learning');

  const renderers = [];
  if (payload.widgets_promoted?.length) renderers.push('widgets_promoted');
  if (payload.widgets_legacy?.length) renderers.push('widgets_legacy');
  if (payload.engine_v2?.payload?.layout) renderers.push('engine_v2_layout');
  if (payload.profile_config?.widgets) renderers.push('profile_config_widgets');

  const authorities = (authority.sources || []).map((s) => s.id);
  const fallbacks = (authority.sources || []).filter((s) => s.role === 'fallback').length;

  const activeCockpits = dominance.channels?.cockpits?.active_domains?.length ?? 0;
  const fragmentation_score = Number(
    Math.min(
      1,
      (pipelines.length - 1) * 0.15 +
        (renderers.length - 1) * 0.12 +
        (authorities.length - 1) * 0.1 +
        fallbacks * 0.08 +
        (activeCockpits > 1 ? 0.1 : 0)
    ).toFixed(3)
  );

  const fragmentation_detected = fragmentation_score >= 0.35 || pipelines.length >= 3;

  const issues = [];
  if (pipelines.length >= 3) issues.push('multiple_delivery_pipelines');
  if (renderers.length >= 3) issues.push('multiple_renderers');
  if (authorities.length >= 4) issues.push('multiple_authorities');
  if (fallbacks > 0 && authority.runtime_z_present) issues.push('parallel_fallback_and_runtime_z');
  if (dominance.channels?.cockpits?.masks_fallback && !payload.cognitive_render_promotion?.promotion_applied) {
    issues.push('cockpit_shadow_masks_fallback');
  }

  return {
    fragmentation_detected,
    fragmentation_score,
    pipelines,
    renderers,
    authorities,
    issues,
    shadow_eternal_risk: issues.includes('cockpit_shadow_masks_fallback') || issues.includes('multiple_delivery_pipelines')
  };
}

module.exports = { analyzeCognitiveFragmentation };
