'use strict';

const counters = {
  exfiltration_candidates: 0,
  protected_assets: 0,
  suspicious_asset_access: 0,
  scraping_patterns: 0,
  download_profiles: 0,
  evidence_strength: 0,
  asset_exposure: 0,
  data_protection_plans: 0,
  evaluations: 0,
  evaluation_time_ms: 0
};

function increment(name, n = 1) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) counters[name] += n;
}

function setGauge(name, value) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) counters[name] = value;
}

function recordEvaluationTime(ms) {
  counters.evaluation_time_ms = ms;
}

function getSnapshot() {
  return { ...counters };
}

function resetForTests() {
  Object.keys(counters).forEach((k) => { counters[k] = 0; });
}

module.exports = { increment, setGauge, recordEvaluationTime, getSnapshot, resetForTests };
