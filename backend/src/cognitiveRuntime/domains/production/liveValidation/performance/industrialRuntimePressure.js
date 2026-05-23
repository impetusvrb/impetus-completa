'use strict';

function measureIndustrialRuntimePressure(perf = {}, telemetryLoad = {}) {
  const pressure = (perf.render_ms || 0) / 500 + (telemetryLoad.telemetry_load || 0) / 40;
  return {
    pressure: Math.round(pressure * 100) / 100,
    saturation: pressure > 1.2,
    acceptable: pressure <= 1
  };
}

module.exports = { measureIndustrialRuntimePressure };
