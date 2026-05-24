'use strict';

function enforceFrontendAuthority(payload = {}, sovereignty = {}) {
  const promoted = payload.widgets_promoted?.length ?? 0;
  const legacy = payload.widgets_legacy?.length ?? 0;
  const convergence = payload.production_frontend_convergence || {};
  const structuralComplete = payload.structural_complete === true || payload.dashboard_structural_complete === true;

  const legacy_override_detected =
    structuralComplete &&
    legacy > promoted &&
    !payload.cognitive_render_promotion?.promotion_applied;

  const hidden_legacy_rendering =
    legacy > 0 &&
    promoted > 0 &&
    convergence.frontend_convergence_score < 0.6 &&
    payload.cognitive_render_promotion?.promotion_applied;

  const personalized_masking =
    payload.personalized_layout_active === true &&
    convergence.convergence_safe === false;

  const frontend_obeys_runtime_z =
    sovereignty.sovereignty_safe !== false &&
    convergence.convergence_safe !== false &&
    !legacy_override_detected &&
    !hidden_legacy_rendering;

  const frontend_authority_integrity = Number(
    Math.max(
      0,
      Math.min(
        1,
        (frontend_obeys_runtime_z ? 0.5 : 0.15) +
          (convergence.frontend_authority_alignment ?? 0.5) * 0.35 +
          (payload.cognitive_render_promotion?.promotion_applied ? 0.15 : 0)
      )
    ).toFixed(3)
  );

  return {
    frontend_obeys_runtime_z,
    frontend_authority_integrity,
    legacy_override_detected,
    hidden_legacy_rendering,
    frontend_enforcement_safe: frontend_obeys_runtime_z && !hidden_legacy_rendering,
    enforcement_executed: false,
    advisory_only: true
  };
}

module.exports = { enforceFrontendAuthority };
