'use strict';

function computeContextualPrecision(user, ctx = {}) {
  const axis = ctx.functional_axis || user?.functional_axis || user?.functional_area;
  const hasAxis = Boolean(axis && axis !== 'general');
  const hasTenant = Boolean(user?.company_id);
  const hasHierarchy = user?.hierarchy_level != null;

  let score = 0.5;
  if (hasAxis) score += 0.25;
  if (hasTenant) score += 0.15;
  if (hasHierarchy) score += 0.1;

  return {
    contextual_precision_score: Number(Math.min(1, score).toFixed(4)),
    semantic_precision_score: Number((score * 0.92).toFixed(4)),
    axis,
    sufficient: hasAxis && hasTenant
  };
}

module.exports = { computeContextualPrecision };
