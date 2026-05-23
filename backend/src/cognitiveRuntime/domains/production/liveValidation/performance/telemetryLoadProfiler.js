'use strict';

function profileTelemetryLoad(signalBundle = {}) {
  const lines = signalBundle.operational?.lines_active ?? 0;
  const sensors = signalBundle.raw?.monitored?.total ?? 0;
  const load = lines * 2 + sensors;
  return {
    telemetry_load: load,
    pressure_spike: load > 50,
    acceptable: load <= 40
  };
}

module.exports = { profileTelemetryLoad };
