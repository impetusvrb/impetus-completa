'use strict';

const { COCKPIT_RUNTIME_KEYS } = require('../authority/cognitiveAuthorityResolver');

const CHANNELS = Object.freeze(['dashboard', 'kpis', 'smart_summary', 'chat', 'widgets', 'cockpits']);

function analyzeRuntimeDominance(payload = {}, authority = {}) {
  const channels = {};

  channels.dashboard = _classifyChannel(payload, 'dashboard', authority);
  channels.kpis = _classifyChannel(payload, 'kpis', authority);
  channels.smart_summary = _classifyChannel(payload, 'smart_summary', authority);
  channels.chat = _classifyChannel(payload, 'chat', authority);
  channels.widgets = _classifyChannel(payload, 'widgets', authority);
  channels.cockpits = _classifyCockpits(payload);

  const dominates = Object.values(channels).filter((c) => c.mode === 'dominates').map((c) => c.runtime);
  const enriches = Object.values(channels).filter((c) => c.mode === 'enriches').map((c) => c.runtime);
  const observes = Object.values(channels).filter((c) => c.mode === 'observes').map((c) => c.runtime);
  const masksFallback = Object.values(channels).filter((c) => c.masks_fallback === true).map((c) => c.channel || 'unknown');

  const dominantCounts = {};
  for (const ch of Object.values(channels)) {
    if (!ch.runtime) continue;
    dominantCounts[ch.runtime] = (dominantCounts[ch.runtime] || 0) + (ch.mode === 'dominates' ? 1 : ch.mode === 'enriches' ? 0.5 : 0.1);
  }
  const dominant_delivery_runtime =
    Object.entries(dominantCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || authority.dominant_source || 'motor_a';

  return {
    channels,
    dominates: [...new Set(dominates)],
    enriches: [...new Set(enriches)],
    observes: [...new Set(observes)],
    masks_fallback: masksFallback,
    dominant_delivery_runtime
  };
}

function _classifyChannel(payload, channel, authority) {
  const hasV2 = !!(payload.engine_v2?.payload);
  const hasZ = authority.runtime_z_present;
  const hasMotorA = authority.motor_a_pressure > 0.2;
  const hasPromotion = authority.render_promotion_governs;

  let runtime = 'motor_a';
  let mode = 'dominates';
  let masks_fallback = false;

  if (channel === 'kpis') {
    if (payload.kpis_specialized?.length) {
      runtime = 'runtime_z';
      mode = hasMotorA && !payload.kpis?.length ? 'enriches' : 'dominates';
    } else if (payload.kpis?.length) {
      runtime = hasZ ? 'runtime_z' : 'motor_a';
      mode = hasZ ? 'enriches' : 'dominates';
    }
  } else if (channel === 'smart_summary') {
    runtime = payload.specialized_summary ? 'runtime_z' : hasV2 ? 'engine_v2' : 'motor_a';
    mode = payload.specialized_summary ? 'dominates' : 'observes';
  } else if (channel === 'widgets') {
    if (payload.widgets_promoted?.length && hasPromotion) {
      runtime = 'runtime_z';
      mode = 'dominates';
      masks_fallback = hasMotorA;
    } else if (hasV2) {
      runtime = 'engine_v2';
      mode = 'enriches';
    }
  } else if (channel === 'chat') {
    runtime = payload.quality_contextual_questions?.length || payload.production_contextual_questions?.length ? 'runtime_z' : hasV2 ? 'engine_v2' : 'motor_a';
    mode = runtime === 'runtime_z' ? 'enriches' : 'observes';
  } else {
    runtime = hasPromotion && hasZ ? 'runtime_z' : hasV2 ? 'engine_v2' : 'motor_a';
    mode = runtime === 'runtime_z' ? (hasMotorA ? 'enriches' : 'dominates') : 'dominates';
    masks_fallback = runtime === 'runtime_z' && hasMotorA && channel === 'dashboard';
  }

  return { channel, runtime, mode, masks_fallback };
}

function _classifyCockpits(payload) {
  const active = [];
  for (const { domain, key, alt } of COCKPIT_RUNTIME_KEYS) {
    const rt = payload[key] || payload[alt];
    if (rt?.consolidation_applied) {
      active.push({
        domain,
        runtime: 'runtime_z',
        mode: rt.cockpit_mode?.includes('native') ? 'controlled' : 'shadow',
        consolidation: true
      });
    }
  }
  return {
    channel: 'cockpits',
    runtime: active.length ? 'runtime_z' : 'motor_a',
    mode: active.length ? 'dominates' : 'observes',
    active_domains: active,
    masks_fallback: active.length > 0 && !!(payload.widgets_legacy?.length)
  };
}

module.exports = { analyzeRuntimeDominance, CHANNELS };
