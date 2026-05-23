'use strict';

function balanceTelemetryLoad(centers = [], maxCharts = 3) {
  let charts = 0;
  return centers.map((c) => {
    const isChart = c.render_slot === 'grafico_tendencia';
    if (isChart && charts >= maxCharts) {
      return { ...c, render_slot: 'kpi_cards', telemetry_throttled: true };
    }
    if (isChart) charts += 1;
    return c;
  });
}

module.exports = { balanceTelemetryLoad };
