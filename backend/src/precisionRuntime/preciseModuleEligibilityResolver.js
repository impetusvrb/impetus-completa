'use strict';

const { buildTargetingContext, scoreModuleTarget } = require('./runtimeModuleTargeting');

function resolveModuleEligibility(modules, user, ctx = {}) {
  const targeting = buildTargetingContext(user, ctx);
  const list = Array.isArray(modules) ? modules : [];
  const scored = list.map((m) => scoreModuleTarget(m, targeting));
  const eligible = scored.filter((s) => s.eligible);
  const avgConfidence = eligible.length
    ? eligible.reduce((a, s) => a + s.module_delivery_confidence, 0) / eligible.length
    : 0;

  return {
    targeting,
    scored,
    eligible_modules: eligible.map((s) => s.module_id),
    ineligible: scored.filter((s) => !s.eligible),
    module_delivery_confidence: Number(avgConfidence.toFixed(4))
  };
}

module.exports = { resolveModuleEligibility };
