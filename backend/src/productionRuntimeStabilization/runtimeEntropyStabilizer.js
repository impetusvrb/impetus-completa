'use strict';

function stabilizeRuntimeEntropy(entropyPack = {}) {
  const detected = entropyPack.runtime_entropy_detected === true;
  return {
    entropy_controlled: !detected,
    entropy_score: entropyPack.entropy_score ?? 0,
    hold_activation: detected,
    auto_remediate: false
  };
}

module.exports = { stabilizeRuntimeEntropy };
