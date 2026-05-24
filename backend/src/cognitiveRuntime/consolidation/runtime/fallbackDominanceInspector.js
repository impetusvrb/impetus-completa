'use strict';

function inspectFallbackDominance(payload = {}, authority = {}, dominance = {}) {
  const legacyWidgets = payload.widgets_legacy?.length ?? 0;
  const promotedWidgets = payload.widgets_promoted?.length ?? 0;
  const legacyKpis = payload.kpis_legacy?.length ?? payload.kpis?.length ?? 0;
  const specializedKpis = payload.kpis_specialized?.length ?? 0;

  const widgetRatio = legacyWidgets / Math.max(legacyWidgets + promotedWidgets, 1);
  const kpiRatio = legacyKpis > specializedKpis ? legacyKpis / Math.max(legacyKpis, 1) : 0;

  const fallback_dominance_ratio = Number(
    Math.max(authority.motor_a_pressure || 0, widgetRatio * 0.5 + kpiRatio * 0.3 + (authority.fallback_dominance_suspected ? 0.2 : 0)).toFixed(3)
  );

  const zones = [];

  if (legacyWidgets > promotedWidgets) {
    zones.push({ zone: 'widgets', issue: 'legacy_widgets_exceed_promoted', severity: 'medium' });
  }
  if (!payload.cognitive_render_promotion?.promotion_applied && payload.engine_v2?.payload) {
    zones.push({ zone: 'dashboard', issue: 'engine_v2_without_render_promotion', severity: 'high' });
  }
  if (dominance.masks_fallback?.length > 2) {
    zones.push({ zone: 'multi_channel', issue: 'runtime_z_masks_motor_a', severity: 'low' });
  }
  const shadowEternal = (payload.cognitive_runtime_report?.phase_stack || '').includes('shadow') &&
    !payload.cognitive_render_promotion?.render_active;
  if (shadowEternal) {
    zones.push({ zone: 'runtime', issue: 'shadow_without_controlled_promotion', severity: 'medium' });
  }
  const enrichNeverGoverns =
    authority.sources?.find((s) => s.id === 'enrich_authority')?.active &&
    dominance.dominant_delivery_runtime === 'motor_a';
  if (enrichNeverGoverns) {
    zones.push({ zone: 'enrich', issue: 'enrich_never_governs_delivery', severity: 'medium' });
  }

  return {
    fallback_dominance_ratio,
    fallback_dominates: fallback_dominance_ratio > 0.45,
    zones,
    motor_a_active: authority.motor_a_pressure > 0.15,
    runtime_z_masks_fallback: dominance.masks_fallback || []
  };
}

module.exports = { inspectFallbackDominance };
