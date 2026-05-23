'use strict';

function buildAdaptationContext(payload = {}, ctx = {}) {
  return {
    domain_axis: payload.functional_axis || ctx.domain_axis || 'unknown',
    hierarchy: ctx.hierarchy_level ?? payload.profile_config?.hierarchy_level,
    maturity: payload.executive_cognitive_runtime?.strategic?.maturity ?? null,
    recommendation_only: true
  };
}

module.exports = { buildAdaptationContext };
