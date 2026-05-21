'use strict';

function assessDashboardOperationalSignalQuality(kpis = []) {
  const count = kpis.length;
  const generic = count <= 2;
  const score = count === 0 ? 0.2 : generic ? 0.55 : Math.min(1, 0.5 + count * 0.08);
  return { operational_signal_quality: Number(score.toFixed(4)), generic_cockpit: generic };
}

module.exports = { assessDashboardOperationalSignalQuality };
