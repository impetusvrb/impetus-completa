'use strict';

const _m = { reports: 0, pressure_events: 0, optimization_hints: 0, avg_efficiency: 0.82 };

function recordTuningReport(sample = {}) {
  _m.reports += 1;
  if (sample.efficiency != null) {
    const w = 1 / Math.min(_m.reports, 100);
    _m.avg_efficiency = Number((_m.avg_efficiency * (1 - w) + sample.efficiency * w).toFixed(4));
  }
  if (sample.pressure) _m.pressure_events += 1;
  if (sample.optimizations) _m.optimization_hints += sample.optimizations;
}

function getRuntimeTuningTelemetry() {
  return { ..._m, ts: new Date().toISOString() };
}

function resetRuntimeTuningTelemetry() {
  _m.reports = 0;
  _m.pressure_events = 0;
  _m.optimization_hints = 0;
  _m.avg_efficiency = 0.82;
}

module.exports = { recordTuningReport, getRuntimeTuningTelemetry, resetRuntimeTuningTelemetry };
