'use strict';

/**
 * AIOI-P2.2 — SLA Breach Forecast Service (READ ONLY)
 *
 * Projeção de status SLA baseada em tendência histórica de cycle_kpis snapshots.
 * Sem ML, sem IA.
 */

const { isValidUUID } = require('../../utils/security');
const predMetrics = require('./aioiPredictiveMetrics');
const slaService = require('./aioiSlaIntelligenceService');

const SNAPSHOTS_TABLE = 'aioi_metrics_snapshots';
const CYCLE_TYPE = 'cycle_kpis';

const SLA_STAGE_MAP = Object.freeze({
  open_to_triaged:       'open_to_triaged_ms',
  triaged_to_approval:   'triaged_to_approval_ms',
  approval_to_execution: 'approval_to_execution_ms',
  execution_to_outcome:  'execution_to_outcome_ms',
  outcome_to_learning:   'outcome_to_learning_ms',
  end_to_end:            'end_to_end_cycle_ms'
});

function _projectStatus(currentAvg, projectedAvg, threshold) {
  const status = slaService.classifySlaStatus(projectedAvg, threshold).status;
  return status;
}

function _buildCycleTimeSeries(rows, kpiField) {
  if (!rows.length) return [];
  const baseTime = new Date(rows[0].created_at).getTime();
  const dayMs = 86400000;
  return rows.map(r => {
    const payload = predMetrics.parseSnapshotPayload(r.snapshot_payload);
    const val = Number(payload[kpiField]);
    const x = (new Date(r.created_at).getTime() - baseTime) / dayMs;
    return { x, y: Number.isFinite(val) ? val : 0 };
  }).filter(p => p.y > 0);
}

function forecastStageStatus(currentAvg, series, threshold) {
  const current_status = slaService.classifySlaStatus(currentAvg, threshold).status;

  if (!series.length) {
    return {
      current_status,
      forecast_status: current_status,
      confidence: predMetrics.computeForecastConfidence(0, 0)
    };
  }

  const forecastX = series[series.length - 1].x + 7;
  const projected = predMetrics.linearRegressionForecast(series, forecastX);
  const forecast_status = _projectStatus(currentAvg, projected, threshold);

  const recent = series.slice(-3).map(p => p.y);
  const older = series.slice(0, Math.max(1, series.length - 3)).map(p => p.y);
  const recentAvg = predMetrics.simpleMovingAverage(recent, recent.length);
  const olderAvg = predMetrics.simpleMovingAverage(older, older.length);
  const trendDelta = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;

  return {
    current_status,
    forecast_status,
    confidence: predMetrics.computeForecastConfidence(series.length, trendDelta)
  };
}

function buildSlaBreachForecastFromData(currentSla, cycleRows) {
  const result = {};
  for (const [stage, kpiField] of Object.entries(SLA_STAGE_MAP)) {
    const currentAvg = currentSla[stage]?.avg_time_ms ?? null;
    const threshold = slaService.SLA_THRESHOLDS[stage];
    const series = _buildCycleTimeSeries(cycleRows, kpiField);
    result[stage] = forecastStageStatus(currentAvg, series, threshold);
  }
  return result;
}

async function _fetchCycleSnapshots(companyId) {
  return predMetrics.withTenantReadClient(companyId, async (client) => {
    const result = await predMetrics.readQuery(client,
      `SELECT snapshot_payload, created_at
       FROM ${SNAPSHOTS_TABLE}
       WHERE company_id = $1::uuid
         AND snapshot_type = $2
         AND created_at >= now() - INTERVAL '${predMetrics.FORECAST_WINDOW_DAYS} days'
       ORDER BY created_at ASC`,
      [companyId, CYCLE_TYPE]
    );
    return result.rows || [];
  });
}

async function getSlaBreachForecast(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [slaRes, cycleRows] = await Promise.all([
      slaService.getSlaAnalysis(companyId),
      _fetchCycleSnapshots(companyId)
    ]);

    if (!slaRes.ok) {
      predMetrics.recordError(companyId, 'getSlaBreachForecast', slaRes.error);
      return { ok: false, error: slaRes.error };
    }

    const sla_breach_forecast = buildSlaBreachForecastFromData(slaRes.sla_analysis, cycleRows);
    predMetrics.recordSlaForecastGenerated(companyId);
    return { ok: true, sla_breach_forecast };

  } catch (err) {
    predMetrics.recordError(companyId, 'getSlaBreachForecast', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  SLA_STAGE_MAP,
  forecastStageStatus,
  buildSlaBreachForecastFromData,
  getSlaBreachForecast
};
