'use strict';

function monitorWidgetPressure(widgets = []) {
  const promoted = widgets.filter((w) => w.render_promoted !== false && !w.collapsed_generic);
  return {
    pressure: promoted.length / 8,
    widget_count: promoted.length,
    saturated: promoted.length >= 8
  };
}

module.exports = { monitorWidgetPressure };
