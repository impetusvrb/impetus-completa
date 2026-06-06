'use strict';

/**
 * AIOI-P2.4 — Improvement Opportunity Analysis Service (READ ONLY)
 *
 * Oportunidades determinísticas — sem IA, sem texto gerado.
 */

const { isValidUUID } = require('../../utils/security');
const stratMetrics = require('./aioiStrategicMetrics');
const benchmarkService = require('./aioiBenchmarkAnalysisService');
const maturityService = require('./aioiMaturityAnalysisService');
const capacityService = require('./aioiCapacityForecastService');
const bottleneckService = require('./aioiBottleneckAnalysisService');

function _opp(domain, code, gapValue, severity) {
  return { domain, opportunity_code: code, gap_value: gapValue, severity };
}

function detectBenchmarkOpportunities(benchmark) {
  const opps = [];
  if (!benchmark) return opps;

  for (const [metric, data] of Object.entries(benchmark)) {
    const varPct = data?.variation_pct;
    if (varPct != null && varPct > 10) {
      opps.push(_opp('benchmark', `BENCHMARK_${metric.toUpperCase()}_DEGRADED`, varPct,
        varPct > 25 ? 'high' : 'medium'));
    }
    if (varPct != null && varPct < -10 && metric === 'success_rate') {
      opps.push(_opp('benchmark', 'BENCHMARK_SUCCESS_IMPROVING', Math.abs(varPct), 'low'));
    }
  }
  return opps;
}

function detectMaturityOpportunities(maturity) {
  if (!maturity) return [];
  const gap = 100 - (maturity.score || 0);
  if (gap <= 0) return [];
  const severity = gap > 40 ? 'high' : gap > 20 ? 'medium' : 'low';
  return [_opp('maturity', `MATURITY_GAP_${maturity.level?.toUpperCase() || 'UNKNOWN'}`, gap, severity)];
}

function detectThroughputOpportunities(capacity) {
  if (!capacity?.capacity_forecast) return [];
  const cf = capacity.capacity_forecast;
  if (cf.trend === 'decreasing') {
    return [_opp('throughput', 'THROUGHPUT_DECLINING', cf.estimated_daily_throughput, 'high')];
  }
  if (cf.estimated_daily_throughput != null && cf.estimated_daily_throughput < 1) {
    return [_opp('throughput', 'THROUGHPUT_LOW', cf.estimated_daily_throughput, 'medium')];
  }
  return [];
}

function detectBacklogConcentration(bottlenecks) {
  if (!bottlenecks) return [];
  const dims = [
    ['approval', bottlenecks.approval_backlog],
    ['execution', bottlenecks.execution_backlog],
    ['outcome', bottlenecks.outcome_backlog],
    ['learning', bottlenecks.learning_backlog]
  ];
  const total = dims.reduce((s, [, v]) => s + (v || 0), 0);
  if (total <= 0) return [];

  const opps = [];
  for (const [dim, count] of dims) {
    const share = (count / total) * 100;
    if (share >= 50 && count > 5) {
      opps.push(_opp('backlog', `BACKLOG_CONCENTRATION_${dim.toUpperCase()}`, Math.round(share), 'high'));
    }
  }
  return opps;
}

function buildOpportunitiesFromSignals({ benchmark, maturity, capacity, bottlenecks }) {
  return [
    ...detectBenchmarkOpportunities(benchmark),
    ...detectMaturityOpportunities(maturity),
    ...detectThroughputOpportunities(capacity),
    ...detectBacklogConcentration(bottlenecks)
  ];
}

async function getImprovementOpportunities(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [benchmarkRes, maturityRes, capacityRes, bottleneckRes] = await Promise.all([
      benchmarkService.getBenchmarkAnalysis(companyId),
      maturityService.getOperationalMaturity(companyId),
      capacityService.getOperationalCapacityForecast(companyId),
      bottleneckService.getBottleneckSummary(companyId)
    ]);

    const failures = [benchmarkRes, maturityRes, capacityRes, bottleneckRes].filter(r => !r.ok);
    if (failures.length) {
      stratMetrics.recordError(companyId, 'getImprovementOpportunities', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const opportunities = buildOpportunitiesFromSignals({
      benchmark:   benchmarkRes.benchmark,
      maturity:    maturityRes.maturity,
      capacity:    capacityRes,
      bottlenecks: bottleneckRes.bottlenecks
    });

    stratMetrics.recordOpportunityAnalyzed(companyId);
    return { ok: true, improvement_opportunities: { opportunities } };

  } catch (err) {
    stratMetrics.recordError(companyId, 'getImprovementOpportunities', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  detectBenchmarkOpportunities,
  detectMaturityOpportunities,
  detectBacklogConcentration,
  buildOpportunitiesFromSignals,
  getImprovementOpportunities
};
