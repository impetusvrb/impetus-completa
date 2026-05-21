'use strict';

function recordNarrativeStabilityHistory(stability = {}) {
  return {
    stable: stability.stable,
    oscillation_detected: stability.oscillation?.oscillation_detected,
    recorded_at: new Date().toISOString()
  };
}

module.exports = { recordNarrativeStabilityHistory };
