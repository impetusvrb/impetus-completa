'use strict';

function analyzeProductionFrontendConvergence(payload = {}, authority = {}) {
  const promoted = payload.widgets_promoted || [];
  const legacy = payload.widgets_legacy || payload.profile_config?.widgets || [];
  const rt = payload.production_cognitive_runtime;
  const productionNative = rt?.consolidation_applied && rt?.cockpit_mode === 'production_native';
  const structural = payload.module_access_governance?.structural_complete === true;

  const hidden_runtime_widgets = [];
  if (productionNative && promoted.length && legacy.length > promoted.length) {
    hidden_runtime_widgets.push('widgets_promoted_shadowed_by_legacy');
  }
  if (payload.engine_v2?.payload?.layout?.widgets?.length && !payload.cognitive_render_promotion?.promotion_applied) {
    hidden_runtime_widgets.push('v2_without_promotion');
  }
  if (structural && authority.authority_mode === 'AUTHORITATIVE_CONTROLLED') {
    hidden_runtime_widgets.push('structural_may_override_production_cockpit');
  }

  const legacy_render_pressure = Number((legacy.length / Math.max(legacy.length + promoted.length, 1)).toFixed(3));

  const authoritative_widgets_visible =
    authority.authority_mode === 'AUTHORITATIVE_CONTROLLED' && promoted.length > 0 && legacy_render_pressure < 0.4;

  const frontend_authority_alignment = Number(
    Math.max(
      0,
      Math.min(
        1,
        (authoritative_widgets_visible ? 0.45 : 0.15) +
          (productionNative ? 0.3 : 0) +
          (payload.cognitive_render_promotion?.promotion_applied ? 0.2 : 0) -
          hidden_runtime_widgets.length * 0.08 -
          legacy_render_pressure * 0.25
      )
    ).toFixed(3)
  );

  let convergence_safe = false;
  if (frontend_authority_alignment >= 0.72 && authoritative_widgets_visible) convergence_safe = true;
  else if (frontend_authority_alignment >= 0.55 && productionNative) convergence_safe = 'partial';

  const frontend_convergence_score = frontend_authority_alignment;

  return {
    frontend_convergence_score,
    authoritative_widgets_visible,
    legacy_render_pressure,
    hidden_runtime_widgets,
    frontend_authority_alignment,
    convergence_safe: convergence_safe === true,
    convergence_state: convergence_safe === true ? 'converged' : convergence_safe === 'partial' ? 'partial' : 'divergent',
    auto_decisions: false
  };
}

module.exports = { analyzeProductionFrontendConvergence };
