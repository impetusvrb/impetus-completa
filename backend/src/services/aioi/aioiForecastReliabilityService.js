'use strict';

/**
 * AIOI-P3.0 — Forecast Reliability Service (READ ONLY)
 *
 * Compara forecasts P2.2 vs dados históricos reais — sem forecasting novo.
 */

const { isValidUUID } = require('../../utils/security');
const trustMetrics = require('./aioiTrustMetrics');
const backlogForecastService = require('./aioiBacklogForecastService');
const capacityForecastService = require('./aioiCapacityForecastService');

const SNAPSHOTS_TABLE = 'aioi_metrics_snapshots';

async function _fetchLatestSnapshots(companyId) {
  return trustMetrics.withTenantReadClient(companyId, async (client) => {
    const [backlog, throughput] = await Promise.all([
      trustMetrics.readQuery(client,
        `SELECT snapshot_payload FROM ${SNAPSHOTS_TABLE}
         WHERE company_id = $1::uuid AND snapshot_type = 'backlog_snapshot'
         ORDER BY created_at DESC LIMIT 1`, [companyId]),
      trustMetrics.readQuery(client,
        `SELECT snapshot_payload FROM ${SNAPSHOTS_TABLE}
         WHERE company_id = $1::uuid AND snapshot_type = 'throughput_snapshot'
         ORDER BY created_at DESC LIMIT 1`, [companyId])
    ]);
    return {
      backlog: backlog.rows[0] || null,
      throughput: throughput.rows[0] || null
    };
  });
}

function computeForecastReliabilityScore({ backlogForecast, capacityForecast, latestSnapshots }) {
  const accuracies = [];

  if (backlogForecast && latestSnapshots.backlog) {
    const actual = trustMetrics.parseSnapshotPayload(latestSnapshots.backlog.snapshot_payload);
    const fields = ['approval', 'execution', 'outcome', 'learning'];
    for (const f of fields) {
      accuracies.push(trustMetrics.forecastAccuracy(
        backlogForecast[`${f}_backlog_forecast`],
        actual[f]
      ));
    }
  }

  if (capacityForecast && latestSnapshots.throughput) {
    const actual = trustMetrics.parseSnapshotPayload(latestSnapshots.throughput.snapshot_payload);
    accuracies.push(trustMetrics.forecastAccuracy(
      capacityForecast.estimated_daily_throughput,
      actual.daily_throughput
    ));
  }

  if (!accuracies.length) return 50;
  return trustMetrics.clampScore(
    accuracies.reduce((a, b) => a + b, 0) / accuracies.length
  );
}

function buildForecastReliability(signals) {
  const reliability_score = computeForecastReliabilityScore(signals);
  return {
    reliability_score,
    reliability_status: trustMetrics.classifyReliabilityStatus(reliability_score)
  };
}

async function getForecastReliability(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [backlogRes, capacityRes, latestSnapshots] = await Promise.all([
      backlogForecastService.getBacklogForecast(companyId),
      capacityForecastService.getOperationalCapacityForecast(companyId),
      _fetchLatestSnapshots(companyId)
    ]);

    if (!backlogRes.ok || !capacityRes.ok) {
      const err = backlogRes.error || capacityRes.error;
      trustMetrics.recordError(companyId, 'getForecastReliability', err);
      return { ok: false, error: err };
    }

    const forecast_reliability = buildForecastReliability({
      backlogForecast:  backlogRes.backlog_forecast,
      capacityForecast: capacityRes.capacity_forecast,
      latestSnapshots
    });

    trustMetrics.recordReliabilityAnalyzed(companyId);
    return { ok: true, forecast_reliability };

  } catch (err) {
    trustMetrics.recordError(companyId, 'getForecastReliability', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  computeForecastReliabilityScore,
  buildForecastReliability,
  getForecastReliability
};
