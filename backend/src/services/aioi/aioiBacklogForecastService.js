'use strict';

/**
 * AIOI-P2.2 — Backlog Forecast Service (READ ONLY)
 *
 * Projeção determinística via snapshots históricos — regressão linear / média móvel.
 * Sem ML, sem IA.
 */

const { isValidUUID } = require('../../utils/security');
const predMetrics = require('./aioiPredictiveMetrics');

const SNAPSHOTS_TABLE = 'aioi_metrics_snapshots';
const BACKLOG_TYPE = 'backlog_snapshot';
const BACKLOG_FIELDS = Object.freeze([
  'approval', 'execution', 'outcome', 'learning'
]);

async function _fetchBacklogSnapshots(companyId) {
  return predMetrics.withTenantReadClient(companyId, async (client) => {
    const result = await predMetrics.readQuery(client,
      `SELECT snapshot_payload, created_at
       FROM ${SNAPSHOTS_TABLE}
       WHERE company_id = $1::uuid
         AND snapshot_type = $2
         AND created_at >= now() - INTERVAL '${predMetrics.FORECAST_WINDOW_DAYS} days'
       ORDER BY created_at ASC`,
      [companyId, BACKLOG_TYPE]
    );
    return result.rows || [];
  });
}

function _buildTimeSeries(rows, field) {
  if (!rows.length) return [];
  const baseTime = new Date(rows[0].created_at).getTime();
  const dayMs = 86400000;
  return rows.map(r => {
    const payload = predMetrics.parseSnapshotPayload(r.snapshot_payload);
    const val = Number(payload[field]);
    const x = (new Date(r.created_at).getTime() - baseTime) / dayMs;
    return { x, y: Number.isFinite(val) ? val : 0 };
  });
}

function forecastBacklogValue(series) {
  if (!series.length) return 0;
  if (series.length >= 3) {
    const forecastX = series[series.length - 1].x + 7;
    return Math.round(predMetrics.linearRegressionForecast(series, forecastX));
  }
  const values = series.map(p => p.y);
  return Math.round(predMetrics.simpleMovingAverage(values, series.length));
}

function buildBacklogForecastFromSnapshots(rows) {
  const result = {};
  for (const field of BACKLOG_FIELDS) {
    const key = `${field}_backlog_forecast`;
    const series = _buildTimeSeries(rows, field);
    result[key] = forecastBacklogValue(series);
  }
  return result;
}

async function getBacklogForecast(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const rows = await _fetchBacklogSnapshots(companyId);
    const backlog_forecast = buildBacklogForecastFromSnapshots(rows);
    predMetrics.recordBacklogForecastGenerated(companyId);
    return { ok: true, backlog_forecast };

  } catch (err) {
    predMetrics.recordError(companyId, 'getBacklogForecast', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  BACKLOG_FIELDS,
  forecastBacklogValue,
  buildBacklogForecastFromSnapshots,
  getBacklogForecast
};
