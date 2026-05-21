'use strict';

function guardKpiWidgetIntegrity(kpis = []) {
  const valid = kpis.filter((k) => k && (k.key || k.id || k.title || k.label));
  return { widget_count: valid.length, widgets_preserved: valid.length === kpis.length, collapsed: valid.length < kpis.length };
}

module.exports = { guardKpiWidgetIntegrity };
