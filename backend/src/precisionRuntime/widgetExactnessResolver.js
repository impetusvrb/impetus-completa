'use strict';

const phaseL = require('./config/phaseLFeatureFlags');
const { resolveWidgetEligibility } = require('./contextualWidgetEligibility');

function resolveWidgetExactness(widgets, user, ctx = {}) {
  const scored = resolveWidgetEligibility(widgets, user, ctx);
  const eligible = scored.filter((s) => s.eligible);
  const ineligible = scored.filter((s) => !s.eligible);
  const enforcement = phaseL.isPreciseWidgetGovernanceEnabled();

  const insufficient = scored.filter(
    (s) => s.reason === 'dependency_unavailable' || s.reason === 'contextual_insufficiency'
  );

  return {
    widgets: enforcement ? eligible.map((s) => s.widget) : widgets,
    precise_widgets: eligible.map((s) => s.widget),
    widget_delivery_accuracy: eligible.length / Math.max(1, scored.length),
    ineligible,
    insufficient_states: insufficient,
    enforcement_active: enforcement,
    shadow_only: !enforcement,
    auto_filtered: false
  };
}

module.exports = { resolveWidgetExactness };
