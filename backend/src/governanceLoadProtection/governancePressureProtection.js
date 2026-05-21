'use strict';

function protectGovernancePressure(loadPack = {}, entropyPack = {}) {
  const protect = loadPack.overload || entropyPack.runtime_entropy_detected;
  return {
    protection_active: protect,
    recommendation: protect ? 'reduce_observability_layers_hold_scaling' : 'maintain',
    auto_remediate: false,
    saturated: loadPack.overload
  };
}

module.exports = { protectGovernancePressure };
