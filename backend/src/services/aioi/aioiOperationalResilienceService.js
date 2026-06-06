'use strict';

/**
 * AIOI-P2.6 — Operational Resilience Service (READ ONLY)
 *
 * Score de resiliência operacional — sem IA, sem execução.
 */

const { isValidUUID } = require('../../utils/security');
const resMetrics = require('./aioiResilienceMetrics');
const snapshotService = require('./aioiExecutiveSnapshotService');
const maturityService = require('./aioiMaturityAnalysisService');
const stabilityService = require('./aioiOperationalStabilityService');
const consistencyService = require('./aioiGovernanceConsistencyService');
const capacityService = require('./aioiCapacityForecastService');

const RESILIENCE_WEIGHTS = Object.freeze({
  stability:              0.25,
  maturity:               0.20,
  governance_consistency: 0.20,
  success_rate:           0.20,
  capacity_trend:         0.15
});

function computeResilienceScore({
  stabilityScore,
  maturityScore,
  consistencyScore,
  successRate,
  capacityTrend
}) {
  const success = successRate != null ? successRate * 100 : 50;
  const stability = stabilityScore != null ? stabilityScore : 50;
  const maturity = maturityScore != null ? maturityScore : 50;
  const consistency = consistencyScore != null ? consistencyScore : 50;
  const capacity = resMetrics.capacityTrendScore(capacityTrend);

  const raw =
    stability * RESILIENCE_WEIGHTS.stability +
    maturity * RESILIENCE_WEIGHTS.maturity +
    consistency * RESILIENCE_WEIGHTS.governance_consistency +
    success * RESILIENCE_WEIGHTS.success_rate +
    capacity * RESILIENCE_WEIGHTS.capacity_trend;

  return resMetrics.clampScore(raw);
}

async function getOperationalResilience(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [snapshotRes, maturityRes, stabilityRes, consistencyRes, capacityRes] = await Promise.all([
      snapshotService.getExecutiveSnapshot(companyId),
      maturityService.getOperationalMaturity(companyId),
      stabilityService.getOperationalStability(companyId),
      consistencyService.getGovernanceConsistency(companyId),
      capacityService.getOperationalCapacityForecast(companyId)
    ]);

    const failures = [snapshotRes, maturityRes, stabilityRes, consistencyRes, capacityRes].filter(r => !r.ok);
    if (failures.length) {
      resMetrics.recordError(companyId, 'getOperationalResilience', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const resilience_score = computeResilienceScore({
      stabilityScore:   stabilityRes.stability.stability_score,
      maturityScore:    maturityRes.maturity.score,
      consistencyScore: consistencyRes.governance_consistency.score,
      successRate:      snapshotRes.snapshot.operational_success_rate,
      capacityTrend:    capacityRes.capacity_forecast.trend
    });

    const operational_resilience = {
      resilience_score,
      resilience_status: resMetrics.classifyResilienceStatus(resilience_score)
    };

    resMetrics.recordResilienceAnalyzed(companyId);
    return { ok: true, operational_resilience };

  } catch (err) {
    resMetrics.recordError(companyId, 'getOperationalResilience', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  RESILIENCE_WEIGHTS,
  computeResilienceScore,
  getOperationalResilience
};
