'use strict';

const _telemetry = [];

function recordTelemetry(event) {
  _telemetry.push({
    ts: new Date().toISOString(),
    ...event
  });
  if (_telemetry.length > 500) _telemetry.shift();
}

function getTelemetry(limit = 100) {
  return _telemetry.slice(-limit);
}

function clearForTests() {
  _telemetry.length = 0;
}

module.exports = { recordTelemetry, getTelemetry, clearForTests };
