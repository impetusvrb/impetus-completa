'use strict';

const { buildTargetingContext } = require('./runtimeModuleTargeting');

function evaluateWidgetEligibility(widget, targetingCtx) {
  const id = widget?.id || widget?.type || 'unknown';
  const domain = widget?.domain || widget?.meta?.domain;
  const axis = targetingCtx.functional_axis;
  if (!domain) {
    return { eligible: true, confidence: 0.75, reason: 'domain_unspecified_legacy' };
  }
  const match = domain === axis || domain === '*' || domain === 'shared';
  return {
    eligible: match,
    widget_delivery_confidence: match ? 0.88 : 0.18,
    reason: match ? 'domain_match' : 'domain_mismatch',
    widget_id: id
  };
}

function resolveWidgetEligibility(widgets, user, ctx = {}) {
  const targeting = buildTargetingContext(user, ctx);
  const list = Array.isArray(widgets) ? widgets : [];
  return list.map((w) => ({ widget: w, ...evaluateWidgetEligibility(w, targeting) }));
}

module.exports = { resolveWidgetEligibility, evaluateWidgetEligibility };
