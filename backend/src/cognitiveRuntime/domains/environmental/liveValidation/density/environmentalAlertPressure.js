'use strict';

function measureEnvironmentalAlertPressure(centers = []) {
  const alerts = centers.filter((c) => c.render_slot === 'alertas').length;
  return { alert_slots: alerts, alert_fatigue: alerts > 3, within_limit: alerts <= 3 };
}

module.exports = { measureEnvironmentalAlertPressure };
