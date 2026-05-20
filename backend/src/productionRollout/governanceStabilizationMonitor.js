'use strict';

const flags = require('./config/productionRolloutFeatureFlags');
const { logProductionRollout } = require('./productionRolloutLogger');

const _samples = [];

function recordStabilizationSample(sample = {}) {
  _samples.push({ ts: Date.now(), ...sample });
  if (_samples.length > 300) _samples.shift();
}

function computeStabilizationMetrics(ctx = {}) {
  if (!flags.isGovernanceStabilizationEnabled() && !ctx.force) {
    return { monitoring: false };
  }

  const recent = _samples.slice(-50);
  let divergence = 0;
  let degraded = 0;
  let overblock = 0;
  for (const s of recent) {
    if (s.shadow_divergence) divergence++;
    if (s.degraded) degraded++;
    if (s.overblocking) overblock++;
  }
  const n = Math.max(recent.length, 1);

  const stabilization_score = Number((1 - degraded / n - overblock / n * 0.3 - divergence / n * 0.2).toFixed(4));
  const runtime_activation_confidence = Number((stabilization_score * 0.9 + 0.1).toFixed(4));
  const governance_operational_pressure = Number((degraded / n + overblock / n).toFixed(4));
  const contextual_preservation_score = Number((1 - overblock / n * 0.5).toFixed(4));
  const rollout_runtime_integrity = stabilization_score >= 0.85 ? 'intact' : stabilization_score >= 0.65 ? 'watch' : 'degraded';

  const stable = stabilization_score >= 0.85 && rollout_runtime_integrity !== 'degraded';

  if (stable) {
    logProductionRollout('PRODUCTION_GOVERNANCE_STABLE', { stabilization_score });
  } else if (recent.length > 0) {
    logProductionRollout('PRODUCTION_GOVERNANCE_DEGRADED', { stabilization_score, rollout_runtime_integrity });
  }

  return {
    monitoring: true,
    stabilization_score,
    runtime_activation_confidence,
    governance_operational_pressure,
    contextual_preservation_score,
    rollout_runtime_integrity,
    stable,
    sample_count: recent.length
  };
}

function clearForTests() {
  _samples.length = 0;
}

module.exports = { recordStabilizationSample, computeStabilizationMetrics, clearForTests };
