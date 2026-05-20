'use strict';

const phaseI = require('./config/phaseIFeatureFlags');
const { logPhaseI } = require('./phaseILogger');
const { getRuntimeState } = require('./governanceActivationRuntime');

const _samples = [];

function recordRuntimeSample(sample = {}) {
  _samples.push({ ts: Date.now(), ...sample });
  if (_samples.length > 200) _samples.shift();
}

function computeHealth() {
  const recent = _samples.slice(-50);
  let degraded = 0;
  let blocked = 0;
  let sanitized = 0;
  for (const s of recent) {
    if (s.degraded) degraded++;
    if (s.denied) blocked++;
    if (s.sanitized) sanitized++;
  }
  const n = Math.max(recent.length, 1);
  const runtime_overblocking_rate = blocked / n;
  const runtime_context_loss = sanitized / n;
  const activation_degradation_score = degraded / n;
  const activation_stability_score = Number((1 - activation_degradation_score - runtime_overblocking_rate * 0.3).toFixed(4));
  const governance_runtime_health =
    activation_stability_score >= 0.85 ? 'healthy' : activation_stability_score >= 0.65 ? 'watch' : 'degraded';

  if (governance_runtime_health === 'degraded') {
    logPhaseI('GOVERNANCE_RUNTIME_DEGRADED', {
      activation_degradation_score,
      runtime_overblocking_rate
    });
  }

  logPhaseI('GOVERNANCE_RUNTIME_HEALTH', { governance_runtime_health, activation_stability_score });

  return {
    governance_runtime_health,
    activation_stability_score,
    runtime_overblocking_rate,
    runtime_context_loss,
    activation_degradation_score,
    sample_count: recent.length,
    runtime_state: getRuntimeState()
  };
}

function getHealthIfMonitoring() {
  if (!phaseI.isRuntimeGovernanceMonitoringEnabled()) {
    return { monitoring: false };
  }
  return { monitoring: true, ...computeHealth() };
}

module.exports = { recordRuntimeSample, computeHealth, getHealthIfMonitoring };
