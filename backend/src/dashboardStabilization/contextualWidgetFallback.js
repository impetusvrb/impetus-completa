'use strict';

function applyContextualWidgetFallback(widgets = [], ctx = {}) {
  if (widgets.length > 0) return { widgets, fallback_used: false };
  const tier = ctx.canonical_identity?.hierarchy_tier;
  const fallback =
    tier === 'executive'
      ? [{ key: 'strategic_summary', type: 'placeholder' }]
      : [{ key: 'operational_pulse', type: 'placeholder' }];
  return { widgets: fallback, fallback_used: true, applied: false };
}

module.exports = { applyContextualWidgetFallback };
