'use strict';

/**
 * Métricas leves em memória para comparativo de performance (Fase 1 boot).
 */
const samples = new Map();
const MAX_SAMPLES_PER_KEY = 200;

function record(key, ms) {
  if (!key || !Number.isFinite(ms)) return;
  const list = samples.get(key) || [];
  list.push({ ms, at: Date.now() });
  if (list.length > MAX_SAMPLES_PER_KEY) list.shift();
  samples.set(key, list);
}

function summarize(key) {
  const list = samples.get(key) || [];
  if (!list.length) return { count: 0, mean_ms: 0, max_ms: 0, last_ms: 0 };
  const vals = list.map((x) => x.ms);
  const sum = vals.reduce((a, b) => a + b, 0);
  return {
    count: vals.length,
    mean_ms: Math.round((sum / vals.length) * 100) / 100,
    max_ms: Math.max(...vals),
    last_ms: vals[vals.length - 1]
  };
}

function snapshot() {
  const out = {};
  for (const key of samples.keys()) {
    out[key] = summarize(key);
  }
  return out;
}

module.exports = { record, summarize, snapshot };
