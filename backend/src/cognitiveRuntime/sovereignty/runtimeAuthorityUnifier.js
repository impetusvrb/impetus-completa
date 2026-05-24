'use strict';

const AUTHORITY_CHANNELS = Object.freeze([
  'delivery',
  'insight',
  'timeline',
  'graph',
  'economic',
  'trust',
  'confidence',
  'memory'
]);

function _channelRuntime(payload, channel) {
  const map = {
    delivery: payload.production_authority_runtime?.authority_mode === 'AUTHORITATIVE_CONTROLLED' ? 'runtime_z' : 'mixed',
    insight: payload.production_delivery_certification?.certification_safe ? 'runtime_z' : 'motor_a',
    timeline: payload.production_cognitive_runtime?.consolidation_applied ? 'runtime_z' : 'motor_a',
    graph: payload.production_operational_graph_runtime ? 'runtime_z' : 'off',
    economic: payload.operational_economic_runtime ? 'runtime_z' : 'off',
    trust: payload.cognitive_trust_runtime ? 'runtime_z' : 'off',
    confidence: payload.real_confidence_runtime ? 'runtime_z' : 'off',
    memory: payload.operational_memory_runtime ? 'runtime_z' : 'off'
  };
  return map[channel] || 'off';
}

function unifyRuntimeAuthority(payload = {}) {
  const unified_runtime_authority = {};
  const overlapping_authorities = [];
  const activeRuntimes = new Set();

  for (const ch of AUTHORITY_CHANNELS) {
    const rt = _channelRuntime(payload, ch);
    unified_runtime_authority[ch] = rt;
    if (rt !== 'off' && rt !== 'mixed') activeRuntimes.add(rt);
    if (rt === 'mixed') overlapping_authorities.push({ channel: ch, runtimes: ['runtime_z', 'motor_a'] });
  }

  const enrichResidual =
    (payload.kpis_specialized?.length ?? 0) > 0 && (payload.widgets_promoted?.length ?? 0) === 0;
  const v2Residual = (payload.engine_v2?.payload?.layout?.widgets?.length ?? 0) > 0;
  const legacyWidgets = payload.widgets_legacy?.length ?? 0;
  const promoted = payload.widgets_promoted?.length ?? 0;

  if (enrichResidual) overlapping_authorities.push({ channel: 'enrich', runtimes: ['enrich', 'runtime_z'] });
  if (v2Residual) overlapping_authorities.push({ channel: 'delivery', runtimes: ['engine_v2', 'runtime_z'] });
  if (legacyWidgets > promoted) overlapping_authorities.push({ channel: 'widgets', runtimes: ['motor_a', 'runtime_z'] });

  const runtime_competition_detected =
    overlapping_authorities.length > 0 ||
    activeRuntimes.size > 2 ||
    (legacyWidgets > promoted && payload.cognitive_render_promotion?.promotion_applied);

  const authority_fragmentation = Number(
    Math.min(1, overlapping_authorities.length * 0.15 + (runtime_competition_detected ? 0.25 : 0)).toFixed(3)
  );

  const authority_integrity = Number(
    Math.max(0, Math.min(1, 1 - authority_fragmentation - (runtime_competition_detected ? 0.1 : 0))).toFixed(3)
  );

  return {
    unified_runtime_authority,
    overlapping_authorities,
    authority_fragmentation,
    runtime_competition_detected,
    authority_integrity,
    duplicated_cognition_detected: enrichResidual || (v2Residual && promoted > 0),
    auto_mutation: false
  };
}

module.exports = { unifyRuntimeAuthority };
