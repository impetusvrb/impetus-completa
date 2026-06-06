'use strict';

/**
 * AIOI-P2.6 — Sustainability Analysis Service (READ ONLY)
 *
 * Capacidade de manter desempenho — reutiliza resultados P2.1/P2.2/P2.3, sem forecast novo.
 */

const { isValidUUID } = require('../../utils/security');
const resMetrics = require('./aioiResilienceMetrics');
const benchmarkService = require('./aioiBenchmarkAnalysisService');
const trendService = require('./aioiTrendAnalysisService');
const capacityService = require('./aioiCapacityForecastService');
const slaService = require('./aioiSlaIntelligenceService');

const STABLE_VARIATION_MAX = 10;

function _benchmarkStabilityScore(benchmark) {
  if (!benchmark) return 50;
  const metrics = ['success_rate', 'cycle_time', 'backlog_total'];
  let stable = 0;
  let total = 0;
  for (const m of metrics) {
    const v = benchmark[m]?.variation_pct;
    if (v != null) {
      total++;
      if (Math.abs(v) <= STABLE_VARIATION_MAX) stable++;
    }
  }
  return total > 0 ? resMetrics.clampScore((stable / total) * 100) : 50;
}

function _trendStabilityScore(trendAnalysis) {
  if (!trendAnalysis) return 50;
  const trends = [
    trendAnalysis.success_rate_trend,
    trendAnalysis.cycle_time_trend,
    trendAnalysis.approval_backlog_trend,
    trendAnalysis.execution_backlog_trend
  ];
  const stableCount = trends.filter(t => t === 'stable' || t === 'improving').length;
  return resMetrics.clampScore((stableCount / trends.length) * 100);
}

function _capacityStabilityScore(capacityForecast) {
  if (!capacityForecast) return 50;
  const trend = capacityForecast.trend;
  if (trend === 'stable' || trend === 'increasing') return 85;
  if (trend === 'decreasing') return 35;
  return 50;
}

function _slaStabilityScore(slaAnalysis) {
  if (!slaAnalysis) return 50;
  const stages = Object.values(slaAnalysis);
  if (!stages.length) return 50;
  const within = stages.filter(s => s.status === 'within_sla').length;
  return resMetrics.clampScore((within / stages.length) * 100);
}

function computeSustainabilityScore({ benchmark, trendAnalysis, capacityForecast, slaAnalysis }) {
  const raw =
    _benchmarkStabilityScore(benchmark) * 0.25 +
    _trendStabilityScore(trendAnalysis) * 0.25 +
    _capacityStabilityScore(capacityForecast) * 0.25 +
    _slaStabilityScore(slaAnalysis) * 0.25;
  return resMetrics.clampScore(raw);
}

async function getOperationalSustainability(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [benchmarkRes, trendRes, capacityRes, slaRes] = await Promise.all([
      benchmarkService.getBenchmarkAnalysis(companyId),
      trendService.getTrendAnalysis(companyId),
      capacityService.getOperationalCapacityForecast(companyId),
      slaService.getSlaAnalysis(companyId)
    ]);

    const failures = [benchmarkRes, trendRes, capacityRes, slaRes].filter(r => !r.ok);
    if (failures.length) {
      resMetrics.recordError(companyId, 'getOperationalSustainability', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const sustainability_score = computeSustainabilityScore({
      benchmark:        benchmarkRes.benchmark,
      trendAnalysis:    trendRes.trend_analysis,
      capacityForecast: capacityRes.capacity_forecast,
      slaAnalysis:      slaRes.sla_analysis
    });

    const sustainability = {
      sustainability_score,
      sustainability_status: resMetrics.classifySustainabilityStatus(sustainability_score)
    };

    resMetrics.recordSustainabilityAnalyzed(companyId);
    return { ok: true, sustainability };

  } catch (err) {
    resMetrics.recordError(companyId, 'getOperationalSustainability', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  STABLE_VARIATION_MAX,
  _benchmarkStabilityScore,
  _trendStabilityScore,
  _capacityStabilityScore,
  _slaStabilityScore,
  computeSustainabilityScore,
  getOperationalSustainability
};
