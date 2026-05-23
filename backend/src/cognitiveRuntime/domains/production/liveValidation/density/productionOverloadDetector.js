'use strict';

function detectProductionOverload(consolidated = {}) {
  const centers = consolidated.centers?.length ?? 0;
  const widgets = consolidated.widgets?.filter((w) => !w.collapsed_generic)?.length ?? 0;
  const charts = (consolidated.centers || []).filter((c) => c.render_slot === 'grafico_tendencia').length;
  const overload = centers > 6 || widgets > 8 || charts > 3;
  return {
    overload_detected: overload,
    centers,
    widgets,
    critical_charts: charts,
    limits: { max_centers: 6, max_widgets: 8, max_charts: 3 }
  };
}

module.exports = { detectProductionOverload };
