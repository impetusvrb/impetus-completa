'use strict';

function composeGovernedContext(user, layers = {}, ctx = {}) {
  const axis = ctx.functional_axis || user?.functional_axis || user?.functional_area;
  const composition = {
    user_profile: {
      id: user?.id,
      role: user?.role,
      hierarchy_level: user?.hierarchy_level
    },
    operational: {
      functional_axis: axis,
      tenant_id: user?.company_id,
      visible_modules: layers.visible_modules || ctx.visible_modules || []
    },
    semantic: layers.semantic || ctx.semantic_alignment || null,
    precision: layers.precision || ctx.precision_delivery || null,
    exposure: layers.exposure || ctx.content_exposure || null,
    composed_at: new Date().toISOString()
  };

  const layerCount = [composition.semantic, composition.precision, composition.exposure].filter(Boolean).length;
  const unification_score = Number((0.6 + layerCount * 0.12).toFixed(4));

  return { composition, contextual_unification_score: Math.min(1, unification_score) };
}

module.exports = { composeGovernedContext };
