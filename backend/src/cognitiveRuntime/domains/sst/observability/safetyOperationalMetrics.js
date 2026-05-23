'use strict';

function buildSafetyOperationalMetrics(centers = [], widgets = []) {
  const incident = centers.find((c) => c.center_id === 'safety_incident_intelligence');
  const permit = centers.find((c) => c.center_id === 'safety_permit_governance');
  return {
    phase: 'Z.25',
    centers_active: centers.length,
    widgets_promoted: widgets.filter((w) => w.render_promoted !== false).length,
    open_incidents: incident?.metrics?.open_incidents ?? 0,
    permits_critical: permit?.metrics?.permits_critical ?? 0,
    safety_native: true
  };
}

module.exports = { buildSafetyOperationalMetrics };
