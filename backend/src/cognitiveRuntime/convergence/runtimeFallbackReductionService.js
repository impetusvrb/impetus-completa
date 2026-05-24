'use strict';

const { CHANNELS } = require('../consolidation/delivery/runtimeDominanceAnalyzer');

function analyzeRuntimeFallbackReduction(payload = {}, authority = {}, dominance = {}, qualityPressure = {}) {
  const channels = dominance.channels || {};
  const motorAChannels = [];
  const zSafe = [];
  const blocked = [];

  for (const ch of CHANNELS) {
    const info = channels[ch];
    if (!info) continue;
    if (info.runtime === 'motor_a' && info.mode === 'dominates') motorAChannels.push(ch);
    else if (info.runtime === 'runtime_z' && (info.mode === 'dominates' || info.mode === 'enriches')) zSafe.push(ch);
    else if (info.runtime === 'engine_v2') blocked.push({ channel: ch, reason: 'v2_residual_audit_required' });
  }

  const fallback_dominance_ratio = qualityPressure.fallback_dominance_ratio ?? authority.fallback_dominance_ratio ?? 0;
  const reducible = motorAChannels.filter((c) => zSafe.includes(c) || c === 'widgets');
  const reducible_fallback_ratio = Number((reducible.length / Math.max(motorAChannels.length, 1) * fallback_dominance_ratio).toFixed(3));

  let migration_readiness = 'observe';
  if (fallback_dominance_ratio < 0.3 && qualityPressure.runtime_z_effective_ratio > 0.6) migration_readiness = 'expand_controlled';
  else if (fallback_dominance_ratio < 0.45) migration_readiness = 'reduce_fallback';

  return {
    fallback_dominance_ratio,
    reducible_fallback_ratio,
    safe_runtime_z_channels: zSafe,
    blocked_channels: blocked,
    motor_a_dominated_channels: motorAChannels,
    migration_readiness,
    motor_a_removed: false,
    engine_v2_removed: false,
    auto_mutation: false
  };
}

module.exports = { analyzeRuntimeFallbackReduction };
