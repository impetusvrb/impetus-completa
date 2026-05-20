'use strict';

const phaseG = require('../explainability/config/phaseGFeatureFlags');
const { logPhaseG } = require('../explainability/phaseGLogger');

const _window = [];
const WINDOW_SIZE = Number(process.env.IMPETUS_GOVERNANCE_DRIFT_WINDOW || 100);

const _baseline = {
  deny_rate: 0,
  shadow_divergence_rate: 0,
  sanitizer_rate: 0,
  samples: 0
};

function recordSample(sample = {}) {
  _window.push({ ts: Date.now(), ...sample });
  if (_window.length > WINDOW_SIZE) _window.shift();
}

function _computeRates(samples) {
  if (!samples.length) return { deny_rate: 0, shadow_divergence_rate: 0, sanitizer_rate: 0 };
  let denies = 0;
  let shadowDiv = 0;
  let sanitized = 0;
  for (const s of samples) {
    if (s.decision === 'deny') denies++;
    if (s.shadow_diverged) shadowDiv++;
    if (s.sanitized) sanitized++;
  }
  const n = samples.length;
  return {
    deny_rate: denies / n,
    shadow_divergence_rate: shadowDiv / n,
    sanitizer_rate: sanitized / n
  };
}

/**
 * Detecta drift vs baseline móvel.
 */
function detectDrift(opts = {}) {
  if (!phaseG.isGovernanceDriftDetectionEnabled() && !opts.force) {
    return { enabled: false, drift_detected: false };
  }

  const rates = _computeRates(_window);
  if (_baseline.samples < 10) {
    Object.assign(_baseline, rates, { samples: _baseline.samples + 1 });
    return { enabled: true, drift_detected: false, warming: true, rates };
  }

  const driftThreshold = Number(process.env.IMPETUS_GOVERNANCE_DRIFT_THRESHOLD || 0.25);
  const signals = [];

  if (rates.deny_rate - _baseline.deny_rate > driftThreshold) {
    signals.push({ type: 'deny_rate_spike', delta: rates.deny_rate - _baseline.deny_rate });
  }
  if (rates.shadow_divergence_rate - _baseline.shadow_divergence_rate > driftThreshold) {
    signals.push({ type: 'shadow_divergence_spike', delta: rates.shadow_divergence_rate - _baseline.shadow_divergence_rate });
  }
  if (rates.sanitizer_rate - _baseline.sanitizer_rate > driftThreshold) {
    signals.push({ type: 'sanitizer_aggressiveness_spike', delta: rates.sanitizer_rate - _baseline.sanitizer_rate });
  }

  const drift_detected = signals.length > 0;
  if (drift_detected) {
    logPhaseG('GOVERNANCE_DRIFT_DETECTED', { signals, rates, baseline: _baseline });
    if (signals.some((s) => s.type === 'shadow_divergence_spike')) {
      logPhaseG('EXPOSURE_PATTERN_SHIFT', { rates });
    }
    if (rates.deny_rate > 0.5) {
      logPhaseG('COGNITIVE_POLICY_REGRESSION', { deny_rate: rates.deny_rate });
    }
  }

  _baseline.samples++;
  _baseline.deny_rate = _baseline.deny_rate * 0.9 + rates.deny_rate * 0.1;
  _baseline.shadow_divergence_rate =
    _baseline.shadow_divergence_rate * 0.9 + rates.shadow_divergence_rate * 0.1;
  _baseline.sanitizer_rate = _baseline.sanitizer_rate * 0.9 + rates.sanitizer_rate * 0.1;

  return { enabled: true, drift_detected, signals, rates, baseline: { ..._baseline } };
}

function resetForTests() {
  _window.length = 0;
  _baseline.deny_rate = 0;
  _baseline.shadow_divergence_rate = 0;
  _baseline.sanitizer_rate = 0;
  _baseline.samples = 0;
}

module.exports = { recordSample, detectDrift, resetForTests, _computeRates };
