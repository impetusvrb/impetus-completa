'use strict';

function computeCockpitCognitiveHealth(opts = {}) {
  const specializedRatio = Math.min(1, Math.max(0, opts.specialized_ratio ?? 0));
  const genericRatio = Math.min(1, Math.max(0, opts.generic_ratio ?? 0));
  const operationalFocus = Math.min(1, Math.max(0, opts.operational_focus ?? 0));
  const density = opts.density || {};
  const overload = density.overload_detected === true;

  const specialization = specializedRatio;
  const usefulness = Math.min(1, (opts.usefulness ?? 0.5) * (overload ? 0.85 : 1));
  const genericity = genericRatio;
  const cognitiveDensity = overload
    ? 0.9
    : Math.min(1, (density.center_count || 0) / 6);

  return {
    specialization: Math.round(specialization * 1000) / 1000,
    usefulness: Math.round(usefulness * 1000) / 1000,
    genericity: Math.round(genericity * 1000) / 1000,
    operational_focus: Math.round(operationalFocus * 1000) / 1000,
    cognitive_density: Math.round(cognitiveDensity * 1000) / 1000,
    healthy: specialization >= 0.55 && genericity <= 0.45 && !overload
  };
}

module.exports = { computeCockpitCognitiveHealth };
