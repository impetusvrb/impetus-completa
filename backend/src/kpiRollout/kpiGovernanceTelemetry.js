'use strict';

const _m = {
  KPI_delivery_accuracy: 0.88,
  KPI_contextual_precision: 0.87,
  KPI_hierarchy_integrity: 0.9,
  KPI_operational_alignment: 0.86,
  KPI_delivery_confidence: 0.85,
  KPI_runtime_stability: 0.89,
  samples: 0
};

function recordKpiGovernanceSample(sample = {}) {
  _m.samples += 1;
  const w = 1 / Math.min(_m.samples, 200);
  for (const k of Object.keys(_m)) {
    if (k === 'samples') continue;
    if (sample[k] != null) _m[k] = Number((_m[k] * (1 - w) + sample[k] * w).toFixed(4));
  }
}

function getKpiGovernanceTelemetry() {
  return { ..._m, ts: new Date().toISOString() };
}

function resetKpiGovernanceTelemetry() {
  _m.samples = 0;
}

module.exports = { recordKpiGovernanceSample, getKpiGovernanceTelemetry, resetKpiGovernanceTelemetry };
