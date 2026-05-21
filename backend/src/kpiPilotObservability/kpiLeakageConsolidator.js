'use strict';

function consolidateKpiLeakage(pack = {}) {
  const safety = pack.safety?.leakage;
  const pipeline = pack.pipeline;
  return {
    detected: safety?.leakage_detected || (pipeline?.removed_keys?.length > 0),
    removed_keys: pipeline?.removed_keys || [],
    would_hide_sim: safety?.would_hide || []
  };
}

module.exports = { consolidateKpiLeakage };
