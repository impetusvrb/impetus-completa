'use strict';

const _m = { analyses: 0, redundancies_found: 0, legacy_hits: 0, recommendations: 0 };

function recordConsolidationAnalysis(sample = {}) {
  _m.analyses += 1;
  if (sample.redundancies) _m.redundancies_found += sample.redundancies;
  if (sample.legacy) _m.legacy_hits += sample.legacy;
  if (sample.recommendations) _m.recommendations += sample.recommendations;
}

function getConsolidationTelemetry() {
  return { ..._m, ts: new Date().toISOString() };
}

function resetConsolidationTelemetry() {
  _m.analyses = 0;
  _m.redundancies_found = 0;
  _m.legacy_hits = 0;
  _m.recommendations = 0;
}

module.exports = { recordConsolidationAnalysis, getConsolidationTelemetry, resetConsolidationTelemetry };
