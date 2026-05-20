'use strict';

const { resolveWidgetExactness } = require('./widgetExactnessResolver');

function applyCardPrecision(cardsOrWidgets, user, ctx = {}) {
  const exactness = resolveWidgetExactness(cardsOrWidgets, user, ctx);
  return {
    cards: exactness.widgets,
    card_precision: {
      widget_delivery_accuracy: Number(exactness.widget_delivery_accuracy.toFixed(4)),
      ineligible_count: exactness.ineligible.length,
      enforcement_active: exactness.enforcement_active,
      shadow_only: exactness.shadow_only,
      states: exactness.ineligible.map((i) => ({
        widget_id: i.widget_id,
        state: i.eligible ? 'ok' : 'semantic_incompatibility',
        reason: i.reason
      }))
    },
    exactness
  };
}

module.exports = { applyCardPrecision };
