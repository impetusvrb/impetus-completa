'use strict';

/**
 * Avalia estabilidade temporal da governança (shadow + drift).
 */
function evaluateStability(ctx = {}) {
  const {
    shadow_divergence_rate = 0,
    governance_drift_rate = 0,
    drift_signals = [],
    sanitizer_aggressiveness = 0
  } = ctx;

  let drift_stability = 'stable';
  if (governance_drift_rate > 0.35 || drift_signals.length >= 2) drift_stability = 'unstable';
  else if (governance_drift_rate > 0.15 || shadow_divergence_rate > 0.1) drift_stability = 'watch';

  let shadow_quality = 'good';
  if (shadow_divergence_rate > 0.15) shadow_quality = 'poor';
  else if (shadow_divergence_rate > 0.05) shadow_quality = 'fair';

  const telemetry_maturity =
    sanitizer_aggressiveness < 0.3 && shadow_divergence_rate < 0.08 ?
      'mature' :
      sanitizer_aggressiveness < 0.5 ?
        'developing' :
        'immature';

  return {
    drift_stability,
    shadow_quality,
    telemetry_maturity,
    stable: drift_stability === 'stable' && shadow_quality !== 'poor'
  };
}

module.exports = { evaluateStability };
