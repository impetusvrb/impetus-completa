'use strict';

/**
 * Auto-ajuste com anti-sobre-reacção: média móvel (EMA), decay lento, cooldown entre ajustes,
 * limites máximos e recuperação gradual quando métricas melhoram.
 */

let _pipelineConservatism = 1;
let _anticipationBias = 0;
let _emaFb = 0;
let _emaDeg = 0;
let _lastAdjustAt = 0;

const ADJUST_COOLDOWN_MS = Math.max(
  15000,
  parseInt(process.env.IMPETUS_FEEDBACK_ADJUST_COOLDOWN_MS || '60000', 10) || 60000
);
const MAX_CONSERV = Math.min(
  1.65,
  parseFloat(process.env.IMPETUS_FEEDBACK_MAX_CONSERVATISM || '1.45') || 1.45
);
const MAX_BIAS = Math.min(35, parseInt(process.env.IMPETUS_FEEDBACK_MAX_BIAS || '28', 10) || 28);

function _smooth(prev, next, alpha) {
  return prev * (1 - alpha) + next * alpha;
}

function tickFromMetrics() {
  try {
    const now = Date.now();
    const m = require('./resilienceMetricsService').getPublicSnapshot();
    const fb = m.fallback_usage_window && m.fallback_usage_window.count ? m.fallback_usage_window.count : 0;
    const degPct =
      typeof m.heavy_degraded_passthrough_pct === 'number' ? m.heavy_degraded_passthrough_pct : 0;

    _emaFb = _smooth(_emaFb, fb, 0.32);
    _emaDeg = _smooth(_emaDeg, degPct, 0.32);

    _pipelineConservatism = Math.max(1, _pipelineConservatism * 0.993 - 0.0008);
    _anticipationBias = Math.max(0, _anticipationBias - 0.14);

    if (now - _lastAdjustAt < ADJUST_COOLDOWN_MS) {
      return;
    }

    let deltaCons = 0;
    let deltaBias = 0;
    if (_emaFb >= 7 || _emaDeg >= 32) {
      deltaCons = 0.022;
      deltaBias = 1.4;
    } else if (_emaFb <= 2.5 && _emaDeg <= 14) {
      deltaCons = -0.014;
      deltaBias = -0.75;
    }

    if (deltaCons !== 0 || deltaBias !== 0) {
      _lastAdjustAt = now;
      _pipelineConservatism = Math.min(MAX_CONSERV, Math.max(1, _pipelineConservatism + deltaCons));
      _anticipationBias = Math.min(MAX_BIAS, Math.max(0, Math.round(_anticipationBias + deltaBias)));
    }
  } catch (_e) {
    /* ignore */
  }
}

setInterval(() => tickFromMetrics(), 45000).unref?.();

function getConservatismMultiplier() {
  return _pipelineConservatism;
}

function getAnticipationBiasPoints() {
  return Math.round(_anticipationBias);
}

function shouldAnticipateLimitedPressure() {
  return _anticipationBias >= 12 || _pipelineConservatism >= 1.22;
}

function getSnapshot() {
  const intensity = Math.min(
    100,
    Math.max(0, (_pipelineConservatism - 1) * 175 + _anticipationBias * 1.15)
  );
  return {
    pipeline_conservatism: Math.round(_pipelineConservatism * 1000) / 1000,
    anticipation_bias_points: Math.round(_anticipationBias),
    anticipate_limited_pressure: shouldAnticipateLimitedPressure(),
    ema_fallback_events: Math.round(_emaFb * 100) / 100,
    ema_heavy_degraded_pct: Math.round(_emaDeg * 100) / 100,
    feedback_intensity: Math.round(intensity * 10) / 10,
    adjust_cooldown_ms: ADJUST_COOLDOWN_MS,
    last_adjust_age_ms: _lastAdjustAt ? Date.now() - _lastAdjustAt : null
  };
}

module.exports = {
  tickFromMetrics,
  getConservatismMultiplier,
  getAnticipationBiasPoints,
  shouldAnticipateLimitedPressure,
  getSnapshot
};
