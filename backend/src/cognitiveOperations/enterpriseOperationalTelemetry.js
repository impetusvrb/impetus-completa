'use strict';

const _m = {
  governance_operational_maturity: 0.82,
  runtime_entropy_score: 0.12,
  convergence_operational_health: 0.86,
  contextual_stability_rate: 0.85,
  runtime_resilience: 0.88,
  cognitive_operational_pressure: 0.25,
  governance_effectiveness_score: 0.84,
  operational_trustworthiness: 0.87,
  samples: 0
};

function recordOperationalSample(sample = {}) {
  _m.samples += 1;
  const w = 1 / Math.min(_m.samples, 100);
  for (const k of Object.keys(_m)) {
    if (k === 'samples') continue;
    if (sample[k] != null) _m[k] = Number((_m[k] * (1 - w) + sample[k] * w).toFixed(4));
  }
}

function getEnterpriseOperationalTelemetry() {
  return { ..._m, ts: new Date().toISOString() };
}

function resetEnterpriseOperationalTelemetry() {
  _m.samples = 0;
  _m.runtime_entropy_score = 0.12;
  _m.cognitive_operational_pressure = 0.25;
}

module.exports = {
  recordOperationalSample,
  getEnterpriseOperationalTelemetry,
  resetEnterpriseOperationalTelemetry
};
