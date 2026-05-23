'use strict';

function balanceAuditPressure(centers = [], maxAlerts = 3) {
  let alerts = 0;
  return centers.map((c) => {
    if (c.render_slot === 'alertas' && alerts >= maxAlerts) {
      return { ...c, render_slot: 'kpi_cards', alert_throttled: true };
    }
    if (c.render_slot === 'alertas') alerts += 1;
    return c;
  });
}

module.exports = { balanceAuditPressure };
