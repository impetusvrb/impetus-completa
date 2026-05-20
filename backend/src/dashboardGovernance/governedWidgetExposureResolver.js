'use strict';

const { resolveCard } = require('./governedDashboardCardResolver');

function resolveWidgets(widgets, ctx = {}) {
  const list = Array.isArray(widgets) ? widgets : [];
  const resolved = list.map((w) => resolveCard(w, ctx));
  const alignment = list.length ?
    resolved.filter((r) => r.aligned).length / list.length :
    1;

  return {
    widgets: resolved.filter((r) => r.visible).map((r) => r.card),
    alignment_score: Number(alignment.toFixed(4)),
    shadow_observations: resolved.filter((r) => !r.aligned),
    auto_removed: false
  };
}

module.exports = { resolveWidgets };
