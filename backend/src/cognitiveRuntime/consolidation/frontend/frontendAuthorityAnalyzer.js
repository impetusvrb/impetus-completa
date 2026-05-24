'use strict';

const COCKPIT_PRIORITY = Object.freeze([
  { key: 'executive_cognitive_runtime', mode: 'executive_native', centers: 'executive_cognitive_centers' },
  { key: 'environmental_cognitive_runtime', mode: 'environmental_native', centers: 'environmental_cognitive_centers' },
  { key: 'maintenance_cognitive_runtime', mode: 'maintenance_native', centers: 'maintenance_cognitive_centers' },
  { key: 'production_cognitive_runtime', mode: 'production_native', centers: 'production_cognitive_centers' },
  { key: 'hr_cognitive_runtime', mode: 'hr_native', centers: 'hr_cognitive_centers' },
  { key: 'sst_cognitive_runtime', mode: 'safety_native', centers: 'safety_cognitive_centers' },
  { key: 'specialized_cockpit_runtime', mode: 'quality_native', centers: 'quality_cognitive_centers' }
]);

function analyzeFrontendAuthority(payload = {}, ctx = {}) {
  const structuralComplete =
    ctx.structural_complete === true || payload.module_access_governance?.structural_complete === true;

  let predicted_source = 'layout_fallback';
  let predicted_runtime = 'motor_a';
  let obeys_runtime_z = false;
  let divergence_risk = 'low';

  for (const { key, mode, centers } of COCKPIT_PRIORITY) {
    const rt = payload[key];
    if (rt?.consolidation_applied === true && rt?.cockpit_mode === mode && payload.widgets_promoted?.length) {
      predicted_source = 'specialized_cockpit_runtime';
      predicted_runtime = 'runtime_z';
      obeys_runtime_z = true;
      break;
    }
  }

  if (!obeys_runtime_z && payload.cognitive_render_promotion?.promotion_applied && payload.widgets_promoted?.length) {
    predicted_source = 'cognitive_render_promotion';
    predicted_runtime = 'runtime_z';
    obeys_runtime_z = true;
  }

  if (!obeys_runtime_z && structuralComplete && payload.engine_v2?.payload?.layout?.widgets?.length) {
    predicted_source = 'engine_v2';
    predicted_runtime = 'engine_v2';
    divergence_risk = payload.cognitive_render_promotion?.promotion_applied ? 'medium' : 'high';
  }

  if (!obeys_runtime_z && !structuralComplete && payload.cognitive_render_promotion?.promotion_applied) {
    predicted_source = 'cognitive_render_promotion';
    predicted_runtime = 'runtime_z';
    obeys_runtime_z = true;
  }

  const backendDominant = ctx.dominant_delivery_runtime || 'motor_a';
  const alignment =
    predicted_runtime === backendDominant
      ? 1
      : predicted_runtime === 'runtime_z' && backendDominant === 'runtime_z'
        ? 1
        : 0.55;

  return {
    predicted_source,
    predicted_runtime,
    obeys_runtime_z,
    divergence_risk,
    frontend_runtime_alignment: Number(alignment.toFixed(3)),
    adapter_priority: 'executive→environmental→maintenance→production→hr→safety→quality→legacy',
    structural_complete: structuralComplete,
    render_promotion_visible: payload.cognitive_render_promotion?.promotion_applied === true
  };
}

module.exports = { analyzeFrontendAuthority, COCKPIT_PRIORITY };
