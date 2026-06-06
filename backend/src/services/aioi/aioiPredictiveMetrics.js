'use strict';

/**
 * AIOI-P2.2 — Métricas e infraestrutura READ ONLY da Predictive Intelligence Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_PREDICTIVE_METRICS';

const TREND_STABLE_EPS = 0.10;
const FORECAST_WINDOW_DAYS = 30;

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  forecastRequests:     0,
  backlogForecast:      0,
  slaForecast:          0,
  capacityForecast:     0,
  riskForecast:         0,
  errors:               0,
  total_latency_ms:     0,
  latency_samples:      0
};

function assertReadOnlySql(sql) {
  const normalized = sql.trim().toUpperCase();
  for (const kw of FORBIDDEN_SQL) {
    if (normalized.startsWith(kw) || normalized.includes(` ${kw} `)) {
      throw new Error('READ_ONLY_LAYER_VIOLATION');
    }
  }
  if (normalized.includes('ON CONFLICT')) {
    throw new Error('READ_ONLY_LAYER_VIOLATION');
  }
}

async function withTenantReadClient(companyId, fn) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function readQuery(client, sql, params) {
  assertReadOnlySql(sql);
  return client.query(sql, params);
}

function _recordLatency(ms) {
  if (typeof ms === 'number' && ms >= 0) {
    _sessionCounters.total_latency_ms += ms;
    _sessionCounters.latency_samples++;
  }
}

function recordForecastRequested(companyId) {
  _sessionCounters.forecastRequests++;
  console.info(`[${LAYER}] AIOI_FORECAST_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.forecastRequests
  });
}

function recordForecastCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_FORECAST_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.forecastRequests
  });
}

function recordBacklogForecastGenerated(companyId) {
  _sessionCounters.backlogForecast++;
  console.info(`[${LAYER}] AIOI_BACKLOG_FORECAST_GENERATED`, {
    company_id: companyId, session_total: _sessionCounters.backlogForecast
  });
}

function recordSlaForecastGenerated(companyId) {
  _sessionCounters.slaForecast++;
  console.info(`[${LAYER}] AIOI_SLA_FORECAST_GENERATED`, {
    company_id: companyId, session_total: _sessionCounters.slaForecast
  });
}

function recordCapacityForecastGenerated(companyId) {
  _sessionCounters.capacityForecast++;
  console.info(`[${LAYER}] AIOI_CAPACITY_FORECAST_GENERATED`, {
    company_id: companyId, session_total: _sessionCounters.capacityForecast
  });
}

function recordRiskForecastGenerated(companyId) {
  _sessionCounters.riskForecast++;
  console.info(`[${LAYER}] AIOI_RISK_FORECAST_GENERATED`, {
    company_id: companyId, session_total: _sessionCounters.riskForecast
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_FORECAST_ERROR`, {
    company_id: companyId,
    context:    context ? String(context).slice(0, 100) : 'unknown',
    error:      error ? String(error).slice(0, 200) : 'unknown',
    session_total: _sessionCounters.errors
  });
}

function getSessionCounters() {
  const avg = _sessionCounters.latency_samples > 0
    ? Math.round(_sessionCounters.total_latency_ms / _sessionCounters.latency_samples)
    : null;
  return {
    forecast_requests:          _sessionCounters.forecastRequests,
    backlog_forecast_count:     _sessionCounters.backlogForecast,
    sla_forecast_count:         _sessionCounters.slaForecast,
    capacity_forecast_count:    _sessionCounters.capacityForecast,
    risk_forecast_count:        _sessionCounters.riskForecast,
    forecast_error_count:       _sessionCounters.errors,
    avg_forecast_latency_ms:    avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    forecastRequests: 0, backlogForecast: 0, slaForecast: 0,
    capacityForecast: 0, riskForecast: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function roundVal(val) {
  if (val == null || !Number.isFinite(Number(val))) return null;
  return Math.round(Number(val) * 100) / 100;
}

/**
 * Regressão linear simples y = slope * x + intercept.
 * points: [{ x, y }] — mínimo 2 pontos para regressão; 1 ponto retorna y constante.
 */
function linearRegressionForecast(points, forecastX) {
  if (!points || points.length === 0) return 0;
  if (points.length === 1) return Math.max(0, points[0].y);

  const n = points.length;
  let sumX = 0; let sumY = 0; let sumXY = 0; let sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return Math.max(0, sumY / n);

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const projected = slope * forecastX + intercept;
  return Math.max(0, projected);
}

function simpleMovingAverage(values, windowSize = 3) {
  if (!values || values.length === 0) return 0;
  const slice = values.slice(-windowSize);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function classifyCapacityTrend(recentRate, olderRate) {
  if (recentRate == null || olderRate == null) return 'stable';
  if (olderRate === 0) return recentRate > 0 ? 'increasing' : 'stable';
  const delta = (recentRate - olderRate) / Math.abs(olderRate);
  if (delta > TREND_STABLE_EPS) return 'increasing';
  if (delta < -TREND_STABLE_EPS) return 'decreasing';
  return 'stable';
}

function computeForecastConfidence(dataPointCount, trendDelta) {
  const base = Math.min(100, Math.max(0, dataPointCount * 15));
  const trendBonus = trendDelta != null && Number.isFinite(trendDelta)
    ? Math.min(40, Math.abs(trendDelta) * 100)
    : 0;
  return Math.min(100, Math.max(0, Math.round(base + trendBonus)));
}

function parseSnapshotPayload(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

module.exports = {
  TREND_STABLE_EPS,
  FORECAST_WINDOW_DAYS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  roundVal,
  linearRegressionForecast,
  simpleMovingAverage,
  classifyCapacityTrend,
  computeForecastConfidence,
  parseSnapshotPayload,
  recordForecastRequested,
  recordForecastCompleted,
  recordBacklogForecastGenerated,
  recordSlaForecastGenerated,
  recordCapacityForecastGenerated,
  recordRiskForecastGenerated,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
