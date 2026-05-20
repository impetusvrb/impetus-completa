'use strict';

const _tenants = new Map();

function tenantKey(tenantId) {
  return String(tenantId || 'global');
}

function getTenantRuntimeState(tenantId) {
  const key = tenantKey(tenantId);
  if (!_tenants.has(key)) {
    _tenants.set(key, {
      calibration_samples: 0,
      last_maturity: null,
      oscillation_count: 0,
      last_scores: []
    });
  }
  return _tenants.get(key);
}

function recordTenantScore(tenantId, score) {
  const s = getTenantRuntimeState(tenantId);
  s.calibration_samples += 1;
  s.last_scores.push(score);
  if (s.last_scores.length > 10) s.last_scores.shift();
  if (s.last_scores.length >= 3) {
    const deltas = [];
    for (let i = 1; i < s.last_scores.length; i++) {
      deltas.push(Math.abs(s.last_scores[i] - s.last_scores[i - 1]));
    }
    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    if (avgDelta > 0.12) s.oscillation_count += 1;
  }
  return s;
}

function clearTenantRuntimeState() {
  _tenants.clear();
}

module.exports = { getTenantRuntimeState, recordTenantScore, clearTenantRuntimeState, tenantKey };
