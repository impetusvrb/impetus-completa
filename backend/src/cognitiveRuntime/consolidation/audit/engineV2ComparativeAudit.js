'use strict';

function _composite(metrics) {
  return Number((Object.values(metrics).reduce((a, b) => a + b, 0) / Object.keys(metrics).length).toFixed(3));
}

function runEngineV2ComparativeAudit(payload = {}, authority = {}, dominance = {}) {
  const v2 = payload.engine_v2?.payload || payload.engine_v2 || {};
  const v2Widgets = v2.layout?.widgets?.length ?? 0;
  const zWidgets = payload.widgets_promoted?.length ?? 0;
  const motorWidgets = payload.widgets_legacy?.length ?? payload.profile_config?.widgets?.length ?? 0;

  const v2Contextual = !!(v2.identity || v2.explainability || v2.assistente_ia);
  const zContextual = !!(
    payload.specialized_summary ||
    payload.quality_contextual_questions?.length ||
    payload.production_contextual_questions?.length ||
    payload.maintenance_contextual_questions?.length
  );

  const scores = {
    motor_a: {
      usefulness: motorWidgets > 0 ? 0.55 : 0.35,
      inference: 0.3,
      contextualidade: 0.25,
      performance: 0.85,
      governanca: 0.7,
      authority: dominance.dominant_delivery_runtime === 'motor_a' ? 0.65 : 0.35,
      render_quality: motorWidgets > 0 ? 0.5 : 0.3
    },
    engine_v2: {
      usefulness: v2Widgets > 0 ? 0.62 : 0.2,
      inference: v2Contextual ? 0.72 : 0.45,
      contextualidade: v2Contextual ? 0.68 : 0.4,
      performance: 0.55,
      governanca: 0.45,
      authority: dominance.dominant_delivery_runtime === 'engine_v2' ? 0.55 : 0.25,
      render_quality: v2Widgets > 0 ? 0.58 : 0.25
    },
    runtime_z: {
      usefulness: zContextual || zWidgets > 0 ? 0.88 : 0.5,
      inference: zContextual ? 0.85 : 0.6,
      contextualidade: zContextual ? 0.9 : 0.55,
      performance: 0.78,
      governanca: 0.92,
      authority: dominance.dominant_delivery_runtime === 'runtime_z' ? 0.82 : 0.5,
      render_quality: zWidgets > 0 ? 0.8 : 0.45
    }
  };

  const ranking = Object.entries(scores)
    .map(([runtime, metrics]) => ({ runtime, composite: _composite(metrics), ...metrics }))
    .sort((a, b) => b.composite - a.composite);

  const zComposite = ranking.find((r) => r.runtime === 'runtime_z')?.composite ?? 0;
  const v2Composite = ranking.find((r) => r.runtime === 'engine_v2')?.composite ?? 0;
  const redundant =
    zComposite - v2Composite > 0.2 &&
    dominance.dominant_delivery_runtime !== 'engine_v2' &&
    !authority.render_promotion_governs;

  return {
    scores,
    ranking,
    engine_v2_adds_value: !redundant && v2Widgets > 0,
    engine_v2_redundant: redundant,
    recommendation: redundant
      ? 'candidate_retirement — runtime Z supera V2 em governança e delivery'
      : v2Widgets > 0
        ? 'maintain_audit — V2 ainda presente em tenants sem render promotion'
        : 'dormant — V2 inactivo neste payload',
    status: redundant ? 'candidate_retirement' : 'audit_active'
  };
}

module.exports = { runEngineV2ComparativeAudit };
