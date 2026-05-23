'use strict';

function resolveIndustrialSensors(raw = {}) {
  const monitored = raw.monitored || { total: 0, critical: 0 };
  return {
    sensor_points_active: monitored.total,
    critical_points: monitored.critical,
    plc_ready: monitored.total > 0,
    degradation_sensors: monitored.critical > 0 ? monitored.critical : 0,
    empty_state: monitored.total === 0
  };
}

module.exports = { resolveIndustrialSensors };
