'use strict';

/**
 * Correlação leve entre amostras (mesmo correlation_id / equipment_id) — assistiva, em memória por tenant.
 */

const _buckets = new Map();
const MAX_PER_KEY = 64;

function _key(companyId, correlationId) {
  return `${companyId}::${correlationId}`;
}

function registerSample(companyId, sample, correlationId) {
  if (!correlationId) return { correlated: false, count: 0 };
  const k = _key(companyId, correlationId);
  let arr = _buckets.get(k);
  if (!arr) {
    arr = [];
    _buckets.set(k, arr);
  }
  arr.push({
    metric_key: sample.metric_key,
    value: sample.value,
    at: sample.recorded_at || new Date().toISOString()
  });
  if (arr.length > MAX_PER_KEY) arr.shift();
  return { correlated: true, count: arr.length, recent: arr.slice(-5) };
}

function clearBucket(companyId, correlationId) {
  _buckets.delete(_key(companyId, correlationId));
}

module.exports = { registerSample, clearBucket };
