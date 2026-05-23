'use strict';

function protectBoardroomAttention(centers = []) {
  const alerts = centers.filter((c) => c.render_slot === 'alertas');
  return {
    alert_fatigue: alerts.length > 3,
    within_limit: alerts.length <= 3,
    strategic_alerts: alerts.slice(0, 3)
  };
}

module.exports = { protectBoardroomAttention };
