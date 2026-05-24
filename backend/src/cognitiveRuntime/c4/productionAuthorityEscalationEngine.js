'use strict';

const CHANNELS = ['widgets', 'insights', 'timeline', 'bottleneck', 'economic', 'graph', 'confidence', 'utility'];

function evaluateProductionAuthorityEscalation(payload = {}, authority = {}, frontend = {}) {
  const legacy = payload.widgets_legacy?.length ?? 0;
  const promoted = payload.widgets_promoted?.length ?? 0;
  const v2 = payload.engine_v2?.payload?.layout?.widgets?.length ?? 0;
  const structural = payload.module_access_governance?.structural_complete === true;

  const legacy_dependency_ratio = Number((legacy / Math.max(legacy + promoted, 1)).toFixed(3));
  const frontend_divergence_detected =
    frontend.convergence_safe === false ||
    frontend.legacy_render_pressure > 0.45 ||
    (structural && frontend.frontend_authority_alignment < 0.7);

  const hidden_fallback = legacy > promoted && payload.cognitive_render_promotion?.promotion_applied;
  const v2_residual = v2 > 0 && authority.authority_mode === 'AUTHORITATIVE_CONTROLLED';

  const authoritative_channels = [];
  const blocked_channels = [];

  if (authority.authority_mode === 'AUTHORITATIVE_CONTROLLED' && !frontend_divergence_detected) {
    if (promoted > 0) authoritative_channels.push('widgets', 'delivery');
    if (payload.production_contextual_questions?.length) authoritative_channels.push('insights');
    if (payload.operational_context_runtime?.timeline_event_count) authoritative_channels.push('timeline');
    if (payload.production_bottleneck_runtime) authoritative_channels.push('bottleneck');
    if (payload.operational_economic_runtime) authoritative_channels.push('economic');
    if (payload.production_operational_graph_runtime) authoritative_channels.push('graph', 'confidence', 'utility');
  }

  if (hidden_fallback) blocked_channels.push({ channel: 'widgets', reason: 'hidden_legacy_fallback' });
  if (v2_residual) blocked_channels.push({ channel: 'delivery', reason: 'v2_residual' });
  if (structural && frontend.legacy_render_pressure > 0.35) {
    blocked_channels.push({ channel: 'layout', reason: 'structural_complete_override' });
  }

  const authority_conflicts = blocked_channels.length + (frontend_divergence_detected ? 1 : 0);

  const escalation_safe =
    authority.authority_mode === 'AUTHORITATIVE_CONTROLLED' &&
    authority_conflicts === 0 &&
    legacy_dependency_ratio < 0.4 &&
    !hidden_fallback;

  let escalation_readiness = 'blocked';
  if (escalation_safe) escalation_readiness = 'ready';
  else if (authority.runtime_authority_score >= 0.5) escalation_readiness = 'partial';

  return {
    authoritative_channels: [...new Set(authoritative_channels)],
    blocked_channels,
    escalation_safe,
    frontend_divergence_detected,
    authority_conflicts,
    legacy_dependency_ratio,
    escalation_readiness,
    auto_mutation: false
  };
}

module.exports = { evaluateProductionAuthorityEscalation, CHANNELS };
