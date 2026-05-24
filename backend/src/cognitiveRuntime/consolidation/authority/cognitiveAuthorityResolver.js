'use strict';

const c0c1 = require('../../config/phaseC0C1FeatureFlags');

const RUNTIME_STATES = Object.freeze(['OFF', 'SHADOW', 'ENRICH', 'CONTROLLED', 'AUTHORITATIVE']);

const COCKPIT_RUNTIME_KEYS = Object.freeze([
  { domain: 'quality', key: 'specialized_cockpit_runtime', alt: 'quality_cognitive_runtime' },
  { domain: 'safety', key: 'sst_cognitive_runtime' },
  { domain: 'hr', key: 'hr_cognitive_runtime' },
  { domain: 'production', key: 'production_cognitive_runtime' },
  { domain: 'environmental', key: 'environmental_cognitive_runtime' },
  { domain: 'maintenance', key: 'maintenance_cognitive_runtime' },
  { domain: 'executive', key: 'executive_cognitive_runtime' }
]);

function _envMode(prefix) {
  const v = String(process.env[prefix] || 'off').toLowerCase();
  if (v === 'shadow') return 'SHADOW';
  if (v === 'enrich' || v === 'enrichment') return 'ENRICH';
  if (v === 'controlled' || v === 'pilot') return 'CONTROLLED';
  if (v === 'authoritative' || v === 'on' || v === 'active') return 'AUTHORITATIVE';
  return 'OFF';
}

function resolveCognitiveAuthority(payload = {}, ctx = {}) {
  const sources = [];

  const motorA = {
    id: 'motor_a',
    role: 'fallback',
    active: !!(payload.kpis_legacy?.length || payload.widgets_legacy?.length || payload.profile_config?.widgets?.length),
    weight: payload.kpis_legacy?.length ? 0.35 : payload.widgets_legacy?.length ? 0.25 : 0.1
  };
  if (motorA.active) sources.push(motorA);

  const engineV2 = {
    id: 'engine_v2',
    role: 'experimental',
    active: !!(payload.engine_v2?.payload || payload.engine_v2?.layout),
    weight: payload.engine_v2?.payload?.layout?.widgets?.length ? 0.4 : 0.15,
    status: c0c1.engineV2Status()
  };
  if (engineV2.active) sources.push(engineV2);

  const runtimeZ = {
    id: 'runtime_z',
    role: 'official',
    active: !!(payload.cognitive_render_promotion || payload.multi_domain_foundation || _anyCockpitRuntime(payload)),
    weight: _runtimeZWeight(payload),
    phase_stack: ctx.cognitive_runtime_report?.phase_stack || null
  };
  if (runtimeZ.active) sources.push(runtimeZ);

  const personalizado = {
    id: 'personalizado',
    role: 'context_layout',
    active: ctx.personalizado_active === true,
    weight: ctx.personalizado_active ? 0.3 : 0
  };
  if (personalizado.active) sources.push(personalizado);

  const renderPromotion = {
    id: 'render_promotion',
    role: 'delivery_gate',
    active: payload.cognitive_render_promotion?.promotion_applied === true,
    weight: payload.cognitive_render_promotion?.promotion_applied ? 0.45 : 0
  };
  if (renderPromotion.active) sources.push(renderPromotion);

  const enrich = {
    id: 'enrich_authority',
    role: 'enrich',
    active: !!(payload.kpis_specialized?.length || payload.specialized_delivery?.applied),
    weight: payload.kpis_specialized?.length ? 0.2 : 0.05
  };
  if (enrich.active) sources.push(enrich);

  const dominant = _pickDominant(sources);
  const fallbackDominance = motorA.weight > (runtimeZ.weight || 0) * 0.8;

  return {
    official_runtime: c0c1.officialRuntimeId(),
    fallback_runtime: c0c1.fallbackRuntimeId(),
    engine_v2_status: engineV2.status || c0c1.engineV2Status(),
    sources,
    dominant_source: dominant?.id || 'motor_a',
    dominant_role: dominant?.role || 'fallback',
    render_promotion_governs: renderPromotion.active,
    runtime_z_present: runtimeZ.active,
    motor_a_pressure: Number(motorA.weight.toFixed(3)),
    engine_v2_pressure: Number(engineV2.weight.toFixed(3)),
    fallback_dominance_suspected: fallbackDominance,
    runtime_states: {
      cognitive_global: _envMode('IMPETUS_COGNITIVE_RUNTIME'),
      composition: _envMode('IMPETUS_COGNITIVE_COMPOSITION_ENGINE'),
      render_promotion: _envMode('IMPETUS_COGNITIVE_RENDER_PROMOTION')
    },
    cockpit_runtimes_present: COCKPIT_RUNTIME_KEYS.filter(({ key, alt }) => payload[key]?.consolidation_applied || payload[alt]?.consolidation_applied).map((c) => c.domain)
  };
}

function _anyCockpitRuntime(payload) {
  return COCKPIT_RUNTIME_KEYS.some(({ key, alt }) => {
    const rt = payload[key] || payload[alt];
    return rt?.consolidation_applied === true;
  });
}

function _runtimeZWeight(payload) {
  let w = 0.2;
  if (payload.cognitive_render_promotion?.promotion_applied) w += 0.25;
  if (_anyCockpitRuntime(payload)) w += 0.35;
  if (payload.adaptive_orchestration) w += 0.05;
  if (payload.governance_learning) w += 0.05;
  if (payload.widgets_promoted?.length) w += 0.1;
  return Math.min(1, w);
}

function _pickDominant(sources) {
  if (!sources.length) return null;
  return [...sources].sort((a, b) => b.weight - a.weight)[0];
}

module.exports = { resolveCognitiveAuthority, RUNTIME_STATES, COCKPIT_RUNTIME_KEYS };
