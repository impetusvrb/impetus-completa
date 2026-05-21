'use strict';

function detectRuntimeEntropy(pack = {}) {
  const instability = pack.scaling?.scaling_instability_detected === true;
  const overload = pack.governance_load?.overload === true;
  const saturation = pack.observability?.saturated === true;
  const entropy = (instability ? 0.35 : 0) + (overload ? 0.35 : 0) + (saturation ? 0.2 : 0);
  return {
    entropy_score: entropy,
    runtime_entropy_detected: entropy >= 0.5,
    protected: entropy < 0.65,
    graceful_degradation: true
  };
}

module.exports = { detectRuntimeEntropy };
