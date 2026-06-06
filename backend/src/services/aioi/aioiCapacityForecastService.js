'use strict';

/**
 * AIOI-P2.2 — Operational Capacity Forecast Service (READ ONLY)
 *
 * Throughput estimado a partir de eventos resolved + learning_processed históricos.
 * Sem ML, sem IA.
 */

const { isValidUUID } = require('../../utils/security');
const predMetrics = require('./aioiPredictiveMetrics');

const IOE_TABLE = 'industrial_operational_events';
const HISTORY_TABLE = 'aioi_processing_history';

async function _fetchDailyResolvedCounts(companyId) {
  return predMetrics.withTenantReadClient(companyId, async (client) => {
    const result = await predMetrics.readQuery(client,
      `SELECT DATE(COALESCE(resolved_at, updated_at)) AS day, COUNT(*) AS cnt
       FROM ${IOE_TABLE}
       WHERE company_id = $1::uuid
         AND status = 'resolved'
         AND COALESCE(resolved_at, updated_at) >= now() - INTERVAL '${predMetrics.FORECAST_WINDOW_DAYS} days'
       GROUP BY DATE(COALESCE(resolved_at, updated_at))
       ORDER BY day ASC`,
      [companyId]
    );
    return result.rows || [];
  });
}

async function _fetchDailyLearningProcessedCounts(companyId) {
  return predMetrics.withTenantReadClient(companyId, async (client) => {
    const result = await predMetrics.readQuery(client,
      `SELECT DATE(created_at) AS day, COUNT(*) AS cnt
       FROM ${HISTORY_TABLE}
       WHERE company_id = $1::uuid
         AND status_to = 'learning_processed'
         AND created_at >= now() - INTERVAL '${predMetrics.FORECAST_WINDOW_DAYS} days'
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
      [companyId]
    );
    return result.rows || [];
  });
}

function _mergeDailyCounts(resolvedRows, learningRows) {
  const byDay = {};
  for (const r of resolvedRows) {
    const day = String(r.day);
    byDay[day] = (byDay[day] || 0) + parseInt(r.cnt, 10);
  }
  for (const r of learningRows) {
    const day = String(r.day);
    byDay[day] = (byDay[day] || 0) + parseInt(r.cnt, 10);
  }
  return Object.values(byDay);
}

function computeCapacityForecast(resolvedRows, learningRows) {
  const dailyCounts = _mergeDailyCounts(resolvedRows, learningRows);

  if (dailyCounts.length === 0) {
    return {
      estimated_daily_throughput:   0,
      estimated_weekly_throughput:  0,
      estimated_monthly_throughput: 0,
      trend: 'stable'
    };
  }

  const estimated_daily = predMetrics.roundVal(
    predMetrics.simpleMovingAverage(dailyCounts, Math.min(7, dailyCounts.length))
  );

  const recentSlice = dailyCounts.slice(-7);
  const olderSlice = dailyCounts.slice(0, Math.max(0, dailyCounts.length - 7));
  const recentRate = recentSlice.length
    ? predMetrics.simpleMovingAverage(recentSlice, recentSlice.length)
    : null;
  const olderRate = olderSlice.length
    ? predMetrics.simpleMovingAverage(olderSlice, olderSlice.length)
    : null;

  return {
    estimated_daily_throughput:   estimated_daily,
    estimated_weekly_throughput:  predMetrics.roundVal(estimated_daily * 7),
    estimated_monthly_throughput: predMetrics.roundVal(estimated_daily * 30),
    trend: predMetrics.classifyCapacityTrend(recentRate, olderRate)
  };
}

async function getOperationalCapacityForecast(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [resolvedRows, learningRows] = await Promise.all([
      _fetchDailyResolvedCounts(companyId),
      _fetchDailyLearningProcessedCounts(companyId)
    ]);

    const capacity_forecast = computeCapacityForecast(resolvedRows, learningRows);
    predMetrics.recordCapacityForecastGenerated(companyId);
    return { ok: true, capacity_forecast };

  } catch (err) {
    predMetrics.recordError(companyId, 'getOperationalCapacityForecast', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  computeCapacityForecast,
  getOperationalCapacityForecast
};
