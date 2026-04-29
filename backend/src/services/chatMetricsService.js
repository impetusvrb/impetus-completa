'use strict';

/**
 * Métricas agregadas em memória para o pipeline handleAIMessage (legacy vs consolidado).
 * Sem persistência; apenas números agregados (sem dados sensíveis).
 */

const metrics = {
  legacy: {
    success: 0,
    error: 0,
    total_time: 0,
    calls: 0
  },
  consolidated: {
    success: 0,
    error: 0,
    total_time: 0,
    calls: 0
  }
};

function bucket(version) {
  return version === 'consolidated' ? metrics.consolidated : metrics.legacy;
}

function clampDurationMs(ms) {
  const n = Number(ms);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function recordSuccess(version, duration) {
  const b = bucket(version);
  const d = clampDurationMs(duration);
  b.success += 1;
  b.calls += 1;
  b.total_time += d;
}

function recordError(version, duration) {
  const b = bucket(version);
  const d = clampDurationMs(duration);
  b.error += 1;
  b.calls += 1;
  b.total_time += d;
}

function getMetrics() {
  const avg = (b) => (b.calls > 0 ? b.total_time / b.calls : 0);
  return {
    legacy: {
      success: metrics.legacy.success,
      error: metrics.legacy.error,
      avg_time: avg(metrics.legacy)
    },
    consolidated: {
      success: metrics.consolidated.success,
      error: metrics.consolidated.error,
      avg_time: avg(metrics.consolidated)
    }
  };
}

module.exports = {
  recordSuccess,
  recordError,
  getMetrics
};
