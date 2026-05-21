'use strict';

function detectRolloutLeakage(pack = {}) {
  const targeting = pack.targeting || pack.summary_runtime_activation?.targeting;
  const leakage = targeting?.narrative_leakage_detected === true || targeting?.hierarchy?.narrative_leakage === true;
  return { leakage_detected: leakage, hierarchy_conflict: targeting?.authority?.conflicting_guidance === true };
}

module.exports = { detectRolloutLeakage };
