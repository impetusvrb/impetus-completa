'use strict';

function analyzeQualityFrontendConvergence(payload = {}, qualityAuthority = {}) {
  const promoted = payload.widgets_promoted || [];
  const legacy = payload.widgets_legacy || payload.profile_config?.widgets || [];
  const structuralComplete = payload.module_access_governance?.structural_complete === true;
  const rt = payload.specialized_cockpit_runtime;
  const qualityNative = rt?.consolidation_applied && rt?.cockpit_mode === 'quality_native';

  const ignored_runtime_widgets = [];
  if (qualityNative && promoted.length && legacy.length > promoted.length) {
    ignored_runtime_widgets.push('widgets_promoted_partially_shadowed');
  }
  if (structuralComplete && !qualityAuthority.governs?.length) {
    ignored_runtime_widgets.push('structural_complete_may_prefer_personalizado');
  }
  if (payload.engine_v2?.payload?.layout?.widgets?.length && !payload.cognitive_render_promotion?.promotion_applied) {
    ignored_runtime_widgets.push('engine_v2_layout_without_promotion');
  }

  const promotion_respected =
    payload.cognitive_render_promotion?.promotion_applied === true &&
    promoted.length > 0 &&
    qualityAuthority.authority_mode === 'AUTHORITATIVE_CONTROLLED';

  const legacy_render_pressure = Number(
    (legacy.length / Math.max(legacy.length + promoted.length, 1)).toFixed(3)
  );

  let convergence_state = 'divergent';
  if (promotion_respected && legacy_render_pressure < 0.35) convergence_state = 'converged';
  else if (qualityNative && promoted.length) convergence_state = 'partial';

  const frontend_convergence_score = Number(
    Math.max(
      0,
      Math.min(
        1,
        (promotion_respected ? 0.45 : 0.15) +
          (qualityNative ? 0.25 : 0) +
          (1 - legacy_render_pressure) * 0.25 -
          ignored_runtime_widgets.length * 0.08
      )
    ).toFixed(3)
  );

  return {
    frontend_convergence_score,
    promotion_respected,
    legacy_render_pressure,
    ignored_runtime_widgets,
    convergence_state,
    adapter_priority_quality: qualityNative ? 'specialized_cockpit_first' : 'legacy_fallback_risk'
  };
}

module.exports = { analyzeQualityFrontendConvergence };
