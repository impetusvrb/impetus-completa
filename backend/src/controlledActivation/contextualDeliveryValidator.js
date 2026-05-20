'use strict';

function validateContextualDelivery(user, ctx = {}) {
  const modules = ctx.visible_modules || [];
  const axis = ctx.functional_axis || user?.functional_axis;
  const precision = ctx.module_targeting_precision ?? ctx.contextual_delivery?.modules?.module_targeting_precision ?? 0.85;
  const issues = [];
  if (!axis || axis === 'general') issues.push({ type: 'ambiguous_axis', severity: 'medium' });
  if (precision < 0.7) issues.push({ type: 'low_module_precision', severity: 'high' });
  return {
    valid: issues.filter((i) => i.severity === 'critical').length === 0,
    contextual_delivery_accuracy: Number(precision.toFixed(4)),
    module_count: modules.length,
    issues
  };
}

module.exports = { validateContextualDelivery };
