'use strict';

function assessRuntimeGovernanceFatigue(stabilityPack = {}) {
  const f = stabilityPack.fatigue || {};
  return {
    fatigued: f.fatigued === true,
    fatigue_score: f.fatigue_score ?? 0,
    runtime_overload: f.fatigued && (stabilityPack.pressure?.overload === true)
  };
}

module.exports = { assessRuntimeGovernanceFatigue };
