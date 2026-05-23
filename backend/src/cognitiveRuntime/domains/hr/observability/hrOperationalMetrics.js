'use strict';

function buildHrOperationalMetrics(centers = [], widgets = []) {
  const people = centers.find((c) => c.center_id === 'hr_people_analytics');
  const absent = centers.find((c) => c.center_id === 'hr_absenteeism_monitor');
  return {
    phase: 'Z.26',
    centers_active: centers.length,
    widgets_promoted: widgets.filter((w) => w.render_promoted !== false).length,
    headcount: people?.metrics?.active_headcount ?? 0,
    absence_index: absent?.metrics?.absence_index ?? 0,
    hr_native: true
  };
}

module.exports = { buildHrOperationalMetrics };
